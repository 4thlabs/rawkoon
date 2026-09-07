package cloud.samlo.rawkoontv.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items as lazyRowItems
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Card
import androidx.tv.material3.CardDefaults
import androidx.tv.material3.Text
import cloud.samlo.rawkoontv.data.Session
import cloud.samlo.rawkoontv.ui.theme.Brand
import cloud.samlo.rawkoontv.ui.theme.ZillaSlab
import coil.compose.AsyncImage

@Composable
fun LibraryScreen(
    session: Session,
    onOpen: (Int, Double, String, String?) -> Unit,
    onLogout: () -> Unit,
) {
    val vm = remember { LibraryViewModel(session.baseUrl ?: "", session.token) }
    val books by vm.books.collectAsState()
    val error by vm.error.collectAsState()
    val loading by vm.loading.collectAsState()
    val loadingMore by vm.loadingMore.collectAsState()
    val hasMore by vm.hasMore.collectAsState()
    val sortBy by vm.sortBy.collectAsState()
    val filter by vm.filter.collectAsState()
    val continueList by vm.continueListening.collectAsState()
    LaunchedEffect(Unit) { vm.load() }

    val nowPlaying by cloud.samlo.rawkoontv.player.NowPlaying.current.collectAsState()
    val gridState = rememberLazyGridState()

    // Fetch the next page as focus/scroll nears the end of the loaded set.
    val nearEnd by remember {
        derivedStateOf {
            val last = gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            books.isNotEmpty() && last >= books.size - 6
        }
    }
    LaunchedEffect(nearEnd, hasMore, loadingMore) {
        if (nearEnd && hasMore && !loadingMore) vm.loadMore()
    }

    Column(Modifier.fillMaxSize().background(Brand.SurfaceBase).padding(start = 40.dp, end = 40.dp, top = 28.dp)) {
        androidx.compose.foundation.layout.Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            Text(
                "Ma bibliothèque",
                fontFamily = ZillaSlab, fontWeight = FontWeight.SemiBold, fontSize = 26.sp,
                color = Brand.TextStrong,
            )
            androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
            nowPlaying?.let { np ->
                androidx.tv.material3.Button(
                    onClick = { onOpen(np.editionId, 0.0, np.title, np.coverUrl) },
                    colors = androidx.tv.material3.ButtonDefaults.colors(
                        containerColor = Brand.SurfaceRaised, contentColor = Brand.Apricot,
                        focusedContainerColor = Brand.Apricot, focusedContentColor = Brand.OnAccent,
                    ),
                ) {
                    androidx.tv.material3.Icon(
                        Icons.Filled.PlayArrow, contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
                    Text(
                        np.title, fontSize = 14.sp, maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                androidx.compose.foundation.layout.Spacer(Modifier.size(12.dp))
            }
            androidx.tv.material3.Button(
                onClick = { session.clear(); LibraryCache.clear(); onLogout() },
                colors = androidx.tv.material3.ButtonDefaults.colors(
                    containerColor = Brand.SurfaceRaised, contentColor = Brand.TextMuted,
                    focusedContainerColor = Brand.Terracotta, focusedContentColor = Brand.OnAccent,
                ),
            ) { Text("Déconnexion", fontSize = 14.sp) }
        }
        androidx.compose.foundation.layout.Row(
            Modifier.fillMaxWidth().padding(top = 16.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            SortBy.entries.forEach { s ->
                FilterChip(s.label, selected = s == sortBy) { vm.setSort(s) }
                androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
            }
            androidx.compose.foundation.layout.Spacer(Modifier.size(12.dp))
            Box(Modifier.size(width = 1.dp, height = 20.dp).background(Brand.Border))
            androidx.compose.foundation.layout.Spacer(Modifier.size(12.dp))
            Filter.entries.forEach { f ->
                FilterChip(f.label, selected = f == filter) { vm.setFilter(f) }
                androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
            }
        }
        Box(Modifier.fillMaxSize().padding(top = 18.dp)) {
            when {
                loading -> Text("Chargement…", color = Brand.TextMuted, fontSize = 16.sp)
                error != null -> Text("Erreur : $error", color = Brand.Terracotta, fontSize = 15.sp)
                books.isEmpty() -> Text("Aucun audiobook.", color = Brand.TextMuted, fontSize = 16.sp)
                else -> LazyVerticalGrid(
                    state = gridState,
                    columns = GridCells.Adaptive(minSize = 132.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(
                        top = 12.dp, bottom = 16.dp, start = 6.dp, end = 6.dp,
                    ),
                ) {
                    // "En cours" rail as a spanned header so it scrolls with the grid,
                    // not pinned above it. In-progress books, newest activity first.
                    if (filter == Filter.ALL && continueList.isNotEmpty()) {
                        item(span = { GridItemSpan(maxLineSpan) }, key = "continue-rail") {
                            Column(Modifier.padding(bottom = 6.dp)) {
                                Text(
                                    "En cours", fontFamily = ZillaSlab, fontWeight = FontWeight.SemiBold,
                                    fontSize = 18.sp, color = Brand.TextStrong,
                                )
                                androidx.compose.foundation.layout.Spacer(Modifier.height(10.dp))
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                                    contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 4.dp),
                                ) {
                                    lazyRowItems(continueList, key = { it.editionId }) { b ->
                                        ContinueCard(b) { onOpen(b.editionId, b.positionSecs, b.title, b.coverUrl) }
                                    }
                                }
                                androidx.compose.foundation.layout.Spacer(Modifier.height(14.dp))
                                Text(
                                    "Bibliothèque", fontFamily = ZillaSlab, fontWeight = FontWeight.SemiBold,
                                    fontSize = 18.sp, color = Brand.TextStrong,
                                )
                            }
                        }
                    }
                    items(books, key = { it.editionId }) { b ->
                        Card(
                            onClick = {
                                onOpen(b.editionId, if (b.finished) 0.0 else b.positionSecs, b.title, b.coverUrl)
                            },
                            // No focus scale — animating a scaled cover bitmap janks on these
                            // weak TV SoCs. Focus is shown by an apricot border + container tint.
                            scale = CardDefaults.scale(focusedScale = 1f),
                            border = CardDefaults.border(
                                focusedBorder = androidx.tv.material3.Border(
                                    androidx.compose.foundation.BorderStroke(2.dp, Brand.Apricot),
                                ),
                            ),
                            colors = CardDefaults.colors(
                                containerColor = Brand.SurfaceRaised,
                                focusedContainerColor = Brand.SurfaceInset,
                            ),
                        ) {
                            Column {
                                Box {
                                    AsyncImage(
                                        model = b.coverUrl, contentDescription = b.title,
                                        modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                                    )
                                    if (b.finished) {
                                        Box(
                                            Modifier.align(androidx.compose.ui.Alignment.TopEnd)
                                                .padding(6.dp).size(24.dp)
                                                .clip(androidx.compose.foundation.shape.CircleShape)
                                                .background(Brand.Apricot),
                                            contentAlignment = androidx.compose.ui.Alignment.Center,
                                        ) {
                                            androidx.tv.material3.Icon(
                                                androidx.compose.material.icons.Icons.Filled.Check,
                                                contentDescription = "Terminé",
                                                tint = Brand.OnAccent,
                                                modifier = Modifier.size(16.dp),
                                            )
                                        }
                                    }
                                }
                                Column(Modifier.padding(horizontal = 8.dp, vertical = 6.dp)) {
                                    Text(
                                        b.title, color = Brand.TextStrong, fontSize = 13.sp,
                                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                                    )
                                    b.author?.let {
                                        Text(
                                            it, color = Brand.TextMuted, fontSize = 11.sp,
                                            maxLines = 1, overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                    val frac = if (b.totalDurationSecs > 0)
                                        (b.positionSecs / b.totalDurationSecs).toFloat().coerceIn(0f, 1f) else 0f
                                    if (frac > 0f || b.finished) {
                                        val shown = if (b.finished) 1f else frac.coerceAtLeast(0.05f)
                                        androidx.compose.foundation.layout.Spacer(Modifier.height(6.dp))
                                        Box(
                                            Modifier.fillMaxWidth().height(5.dp)
                                                .clip(androidx.compose.foundation.shape.RoundedCornerShape(3.dp))
                                                .background(Brand.SurfaceWell),
                                        ) {
                                            Box(
                                                Modifier.fillMaxWidth(shown).height(5.dp)
                                                    .clip(androidx.compose.foundation.shape.RoundedCornerShape(3.dp))
                                                    .background(Brand.Apricot),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (loadingMore) {
                        item(span = { GridItemSpan(maxLineSpan) }) {
                            Box(
                                Modifier.fillMaxWidth().padding(vertical = 16.dp),
                                contentAlignment = androidx.compose.ui.Alignment.Center,
                            ) { Text("Chargement…", color = Brand.TextMuted, fontSize = 14.sp) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ContinueCard(b: cloud.samlo.rawkoontv.data.Audiobook, onClick: () -> Unit) {
    androidx.tv.material3.Card(
        onClick = onClick,
        modifier = Modifier.size(width = 150.dp, height = 210.dp),
        scale = CardDefaults.scale(focusedScale = 1f),
        border = CardDefaults.border(
            focusedBorder = androidx.tv.material3.Border(
                androidx.compose.foundation.BorderStroke(2.dp, Brand.Apricot),
            ),
        ),
        colors = CardDefaults.colors(
            containerColor = Brand.SurfaceRaised, focusedContainerColor = Brand.SurfaceInset,
        ),
    ) {
        Column {
            AsyncImage(
                model = b.coverUrl, contentDescription = b.title,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f),
            )
            Column(Modifier.padding(horizontal = 8.dp, vertical = 6.dp)) {
                Text(
                    b.title, color = Brand.TextStrong, fontSize = 13.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                val frac = if (b.totalDurationSecs > 0)
                    (b.positionSecs / b.totalDurationSecs).toFloat().coerceIn(0f, 1f) else 0f
                androidx.compose.foundation.layout.Spacer(Modifier.height(6.dp))
                Box(
                    Modifier.fillMaxWidth().height(5.dp)
                        .clip(androidx.compose.foundation.shape.RoundedCornerShape(3.dp))
                        .background(Brand.SurfaceWell),
                ) {
                    Box(
                        Modifier.fillMaxWidth(frac.coerceAtLeast(0.05f)).height(5.dp)
                            .clip(androidx.compose.foundation.shape.RoundedCornerShape(3.dp))
                            .background(Brand.Apricot),
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    androidx.tv.material3.Button(
        onClick = onClick,
        colors = androidx.tv.material3.ButtonDefaults.colors(
            containerColor = if (selected) Brand.Apricot else Brand.SurfaceRaised,
            contentColor = if (selected) Brand.OnAccent else Brand.TextMuted,
            focusedContainerColor = Brand.Apricot,
            focusedContentColor = Brand.OnAccent,
        ),
    ) { Text(label, fontSize = 13.sp) }
}
