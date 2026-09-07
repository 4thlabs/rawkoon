package cloud.samlo.rawkoontv.data

import org.junit.Assert.assertEquals
import org.junit.Test

class LibraryRepositoryTest {
    @Test fun flattensAudiobookEditionsMergesProgressResolvesCovers() {
        val books = listOf(
            BookDto(
                id = 1, title = "Alpha", coverUrl = "/covers/1.jpg", authors = listOf("A"),
                editions = listOf(EditionDto(id = 11, kind = "audiobook", durationSecs = 100.0)),
            ),
            BookDto(
                id = 2, title = "Beta", coverUrl = null, authors = listOf("B"),
                editions = listOf(EditionDto(id = 22, kind = "ebook")), // no audiobook -> dropped
            ),
            BookDto(
                id = 3, title = "Gamma", coverUrl = "https://x/3.jpg", authors = listOf("C", "D"),
                editions = listOf(EditionDto(id = 33, kind = "audiobook", durationSecs = 200.0)),
            ),
        )
        val progress = listOf(
            ProgressDto(editionId = 33, positionSecs = 50.0, totalDurationSecs = 200.0, finished = false),
        )
        val out = mergeLibrary(books, progress, "https://s.tld")

        assertEquals(listOf(11, 33), out.map { it.editionId }) // ebook dropped, order kept
        assertEquals(0.0, out[0].positionSecs, 0.0)            // no progress -> 0
        assertEquals(50.0, out[1].positionSecs, 0.0)           // merged by edition id
        assertEquals("https://s.tld/covers/1.jpg", out[0].coverUrl) // relative resolved
        assertEquals("https://x/3.jpg", out[1].coverUrl)       // absolute kept
        assertEquals("C, D", out[1].author)                    // authors joined
    }

    @Test fun readBookCountsAsFinishedEvenWithoutListeningProgress() {
        val books = listOf(
            BookDto(id = 1, title = "Read", authors = listOf("A"), readAt = "2026-09-07T00:00:00Z",
                editions = listOf(EditionDto(id = 11, kind = "audiobook", durationSecs = 100.0))),
            BookDto(id = 2, title = "Unread", authors = listOf("B"),
                editions = listOf(EditionDto(id = 22, kind = "audiobook", durationSecs = 100.0))),
        )
        val out = mergeLibrary(books, emptyList(), "https://s.tld")
        assertEquals(true, out[0].finished)  // read_at -> finished, no progress row needed
        assertEquals(false, out[1].finished)
    }

    @Test fun continueListeningKeepsInProgressOnlyPreservingOrderAndResolvingCovers() {
        val progress = listOf(
            ProgressDto(editionId = 11, title = "Alpha", authors = listOf("A"),
                coverUrl = "/c/11.jpg", positionSecs = 30.0, totalDurationSecs = 100.0, finished = false),
            ProgressDto(editionId = 22, title = "Done", positionSecs = 100.0,
                totalDurationSecs = 100.0, finished = true),           // finished -> dropped
            ProgressDto(editionId = 33, title = "Fresh", positionSecs = 0.0,
                totalDurationSecs = 100.0, finished = false),          // not started -> dropped
            ProgressDto(editionId = 44, title = "Beta", coverUrl = "https://x/44.jpg",
                positionSecs = 10.0, totalDurationSecs = 200.0, finished = false),
            ProgressDto(editionId = 55, title = "ReadInProgress", positionSecs = 20.0,
                totalDurationSecs = 100.0, finished = false),        // read book -> excluded below
        )
        val out = continueListening(progress, readEditionIds = setOf(55), baseUrl = "https://s.tld")

        assertEquals(listOf(11, 44), out.map { it.editionId }) // done, not-started, and read-book dropped
        assertEquals("https://s.tld/c/11.jpg", out[0].coverUrl) // relative resolved
        assertEquals("https://x/44.jpg", out[1].coverUrl)       // absolute kept
        assertEquals(30.0, out[0].positionSecs, 0.0)
    }
}
