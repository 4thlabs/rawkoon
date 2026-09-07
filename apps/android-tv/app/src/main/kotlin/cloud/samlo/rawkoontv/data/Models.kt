package cloud.samlo.rawkoontv.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val json = Json { ignoreUnknownKeys = true; isLenient = true }

@Serializable data class SignInResponse(val token: String)

// GET /api/books?kind=audiobook&page=&limit= -> { items: [Book], total, has_more }.
// A Book carries authors[] + an editions[] array; the AUDIOBOOK EDITION's
// `id` is the editionId used for manifest/progress (NOT the book id).
@Serializable data class BooksResponse(
    val items: List<BookDto> = emptyList(),
    @SerialName("has_more") val hasMore: Boolean = false,
)

@Serializable data class BookDto(
    val id: Int,
    val title: String,
    @SerialName("cover_url") val coverUrl: String? = null,
    val authors: List<String> = emptyList(),
    @SerialName("added_at") val addedAt: String? = null,
    // Set when the user marked the whole book read — the "finished" signal for
    // the library (separate from per-edition listening progress).
    @SerialName("read_at") val readAt: String? = null,
    val editions: List<EditionDto> = emptyList(),
)

@Serializable data class EditionDto(
    val id: Int,
    val kind: String,
    @SerialName("duration_secs") val durationSecs: Double? = null,
    @SerialName("offline_ready") val offlineReady: Boolean = false,
)

// GET /api/books/progress -> { progress: [ProgressDto] }, ordered updated_at desc.
// Each row is enriched with book identity (title/authors/cover), so the
// "Continue listening" rail is built from this one call — no book join.
@Serializable data class ProgressResponse(val progress: List<ProgressDto> = emptyList())

@Serializable data class ProgressDto(
    @SerialName("edition_id") val editionId: Int,
    @SerialName("book_id") val bookId: Int = 0,
    val title: String = "",
    val authors: List<String> = emptyList(),
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("position_secs") val positionSecs: Double = 0.0,
    @SerialName("total_duration_secs") val totalDurationSecs: Double = 0.0,
    val finished: Boolean = false,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable data class ChapterDto(
    val index: Int,
    val title: String,
    @SerialName("start_secs") val startSecs: Double,
    @SerialName("end_secs") val endSecs: Double,
    @SerialName("file_id") val fileId: Int,
    val url: String,
)

@Serializable data class ManifestDto(
    @SerialName("total_duration_secs") val totalDurationSecs: Double,
    val chapters: List<ChapterDto>,
)
