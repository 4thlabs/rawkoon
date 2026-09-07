package cloud.samlo.rawkoontv.data

data class Audiobook(
    val editionId: Int,
    val title: String,
    val author: String?,
    val coverUrl: String?,
    val positionSecs: Double,
    val totalDurationSecs: Double,
    val finished: Boolean,
    val addedAt: String? = null,
    val updatedAt: String? = null,
)

/**
 * "Continue listening" set: in-progress audiobooks straight from the enriched
 * /api/books/progress rows (title/cover already present). The server returns
 * them newest-activity-first, so that order is preserved.
 */
fun continueListening(
    progress: List<ProgressDto>,
    readEditionIds: Set<Int>,
    baseUrl: String,
): List<Audiobook> =
    progress
        .filter { !it.finished && it.positionSecs > 0 && it.editionId !in readEditionIds }
        .map { p ->
            Audiobook(
                editionId = p.editionId,
                title = p.title,
                author = p.authors.joinToString(", ").ifBlank { null },
                coverUrl = resolveUrl(baseUrl, p.coverUrl),
                positionSecs = p.positionSecs,
                totalDurationSecs = p.totalDurationSecs,
                finished = false,
                updatedAt = p.updatedAt,
            )
        }

/**
 * Flattens the /api/books payload to one [Audiobook] per audiobook EDITION,
 * merging listening progress by editionId. Book order is preserved; a book
 * with no audiobook edition is dropped. Cover URLs are resolved against
 * [baseUrl].
 */
fun mergeLibrary(
    books: List<BookDto>,
    progress: List<ProgressDto>,
    baseUrl: String,
): List<Audiobook> {
    val byEdition = progress.associateBy { it.editionId }
    return books.flatMap { book ->
        book.editions.filter { it.kind == "audiobook" }.map { ed ->
            val p = byEdition[ed.id]
            Audiobook(
                editionId = ed.id,
                title = book.title,
                author = book.authors.joinToString(", ").ifBlank { null },
                coverUrl = resolveUrl(baseUrl, book.coverUrl),
                positionSecs = p?.positionSecs ?: 0.0,
                totalDurationSecs = p?.totalDurationSecs ?: (ed.durationSecs ?: 0.0),
                // Read (whole book marked done) or listened-to-the-end both count as finished.
                finished = (p?.finished ?: false) || book.readAt != null,
                addedAt = book.addedAt,
                updatedAt = p?.updatedAt,
            )
        }
    }
}
