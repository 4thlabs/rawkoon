package cloud.samlo.rawkoontv.ui.library

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import cloud.samlo.rawkoontv.data.Audiobook
import cloud.samlo.rawkoontv.data.BookDto
import cloud.samlo.rawkoontv.data.ProgressDto
import cloud.samlo.rawkoontv.data.RawkoonApi
import cloud.samlo.rawkoontv.data.continueListening
import cloud.samlo.rawkoontv.data.mergeLibrary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

private const val PAGE_SIZE = 40

/** Server-side sort — keeps infinite scroll paginating correctly. */
enum class SortBy(val api: String, val dir: String, val label: String) {
    RECENT("added", "desc", "Récents"),
    TITLE("title", "asc", "Titre"),
}

/**
 * Listening-state filter. This is derived from progress (not a server query),
 * so any filter other than [ALL] needs the whole library loaded before it can
 * be applied — the ViewModel loads all pages when one is selected.
 */
enum class Filter(val label: String) {
    ALL("Tous"), IN_PROGRESS("En cours"), FINISHED("Terminés"), NOT_STARTED("Non commencés");

    fun matches(a: Audiobook) = when (this) {
        ALL -> true
        IN_PROGRESS -> !a.finished && a.positionSecs > 0
        FINISHED -> a.finished
        NOT_STARTED -> !a.finished && a.positionSecs <= 0
    }
}

/**
 * Session-scoped cache so returning from the player doesn't refetch. Holds the
 * accumulated pages, the paging cursor, and the active sort/filter.
 */
object LibraryCache {
    var items: List<Audiobook> = emptyList() // merged, unfiltered, server order
    var continueList: List<Audiobook> = emptyList() // in-progress, newest activity first
    var rawBooks: List<BookDto> = emptyList()
    var progress: List<ProgressDto> = emptyList()
    var page = 0
    var hasMore = true
    var loaded = false
    var sortBy = SortBy.RECENT
    var filter = Filter.ALL

    fun clear() {
        items = emptyList(); continueList = emptyList(); rawBooks = emptyList(); progress = emptyList()
        page = 0; hasMore = true; loaded = false; sortBy = SortBy.RECENT; filter = Filter.ALL
    }

    /** Drop the loaded pages but keep sort/filter — used when the sort changes. */
    fun invalidatePages() {
        items = emptyList(); rawBooks = emptyList(); page = 0; hasMore = true; loaded = false
    }
}

/**
 * Library paginates in the chosen server sort so every book is reachable by
 * scrolling; progress is fetched whole (one small call) and merged over the
 * pages, so bars/badges and the listening filter stay correct.
 */
class LibraryViewModel(private val baseUrl: String, private val token: String?) : ViewModel() {
    private val api = RawkoonApi(baseUrl, token)

    val books = MutableStateFlow(display())
    val continueListening = MutableStateFlow(LibraryCache.continueList)
    val error = MutableStateFlow<String?>(null)
    val loading = MutableStateFlow(!LibraryCache.loaded)
    val loadingMore = MutableStateFlow(false)
    val hasMore = MutableStateFlow(footerHasMore())
    val sortBy = MutableStateFlow(LibraryCache.sortBy)
    val filter = MutableStateFlow(LibraryCache.filter)

    private fun display() = LibraryCache.items.filter { LibraryCache.filter.matches(it) }

    /** Audiobook editions whose book is marked read — excluded from the "En cours" rail. */
    private fun readEditionIds(): Set<Int> =
        LibraryCache.rawBooks
            .filter { it.readAt != null }
            .flatMap { b -> b.editions.filter { it.kind == "audiobook" }.map { it.id } }
            .toSet()

    /** Rebuild the "En cours" rail from progress + the currently-known read set. */
    private fun rebuildContinue() {
        LibraryCache.continueList = continueListening(LibraryCache.progress, readEditionIds(), baseUrl)
        continueListening.value = LibraryCache.continueList
    }

    // The scroll footer only paginates in ALL mode; filters load everything up front.
    private fun footerHasMore() = LibraryCache.filter == Filter.ALL && LibraryCache.hasMore

    fun load() {
        if (LibraryCache.loaded) {
            books.value = display(); continueListening.value = LibraryCache.continueList
            hasMore.value = footerHasMore(); loading.value = false
            refreshProgress()
            return
        }
        viewModelScope.launch {
            loading.value = true; error.value = null
            runCatching {
                val prog = runCatching { api.progress() }.getOrDefault(emptyList())
                val s = LibraryCache.sortBy
                val first = api.books(1, PAGE_SIZE, s.api, s.dir)
                LibraryCache.progress = prog
                LibraryCache.rawBooks = first.items
                LibraryCache.page = 1
                LibraryCache.hasMore = first.hasMore
                if (LibraryCache.filter != Filter.ALL) loadAllRemaining(s)
                LibraryCache.items = mergeLibrary(LibraryCache.rawBooks, prog, baseUrl)
                LibraryCache.continueList = continueListening(prog, readEditionIds(), baseUrl)
                LibraryCache.loaded = true
            }.onSuccess {
                books.value = display(); continueListening.value = LibraryCache.continueList
                hasMore.value = footerHasMore()
            }.onFailure {
                error.value = it.message ?: it.toString()
                Log.e("RawkoonLib", "library load failed", it)
            }
            loading.value = false
        }
    }

    fun loadMore() {
        if (LibraryCache.filter != Filter.ALL) return // filters are already fully loaded
        if (loadingMore.value || !LibraryCache.hasMore || !LibraryCache.loaded) return
        viewModelScope.launch {
            loadingMore.value = true
            runCatching {
                val s = LibraryCache.sortBy
                api.books(LibraryCache.page + 1, PAGE_SIZE, s.api, s.dir)
            }.onSuccess { next ->
                LibraryCache.page += 1
                LibraryCache.hasMore = next.hasMore
                LibraryCache.rawBooks = LibraryCache.rawBooks + next.items
                LibraryCache.items = mergeLibrary(LibraryCache.rawBooks, LibraryCache.progress, baseUrl)
                rebuildContinue() // newly-loaded pages may reveal a read book to drop from the rail
                books.value = display(); hasMore.value = footerHasMore()
            }.onFailure { Log.e("RawkoonLib", "load more failed", it) }
            loadingMore.value = false
        }
    }

    fun setSort(next: SortBy) {
        if (next == LibraryCache.sortBy) return
        LibraryCache.sortBy = next; sortBy.value = next
        LibraryCache.invalidatePages() // server order changed → refetch from page 1
        load()
    }

    fun setFilter(next: Filter) {
        if (next == LibraryCache.filter) return
        LibraryCache.filter = next; filter.value = next
        // Switching to a listening filter needs the whole library loaded.
        if (next != Filter.ALL && LibraryCache.hasMore && LibraryCache.loaded) {
            viewModelScope.launch {
                loadingMore.value = true
                runCatching { loadAllRemaining(LibraryCache.sortBy) }
                    .onSuccess {
                        LibraryCache.items = mergeLibrary(LibraryCache.rawBooks, LibraryCache.progress, baseUrl)
                    }
                    .onFailure { Log.e("RawkoonLib", "load all for filter failed", it) }
                loadingMore.value = false
                books.value = display(); hasMore.value = footerHasMore()
            }
        } else {
            books.value = display(); hasMore.value = footerHasMore()
        }
    }

    fun refreshProgress() {
        if (LibraryCache.rawBooks.isEmpty()) return
        viewModelScope.launch {
            runCatching { api.progress() }.onSuccess { prog ->
                LibraryCache.progress = prog
                LibraryCache.items = mergeLibrary(LibraryCache.rawBooks, prog, baseUrl)
                rebuildContinue()
                books.value = display()
            }
        }
    }

    /** Fetch every remaining page in the current sort. Bounded so a bad has_more can't spin forever. */
    private suspend fun loadAllRemaining(s: SortBy) {
        var guard = 0
        while (LibraryCache.hasMore && guard++ < 100) {
            val next = api.books(LibraryCache.page + 1, PAGE_SIZE, s.api, s.dir)
            LibraryCache.page += 1
            LibraryCache.hasMore = next.hasMore
            LibraryCache.rawBooks = LibraryCache.rawBooks + next.items
        }
    }
}
