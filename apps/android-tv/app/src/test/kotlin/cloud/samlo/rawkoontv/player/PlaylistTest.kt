package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ChapterDto
import cloud.samlo.rawkoontv.data.ManifestDto
import org.junit.Assert.assertEquals
import org.junit.Test

class PlaylistTest {
    @Test fun ordersByIndexAndResolvesUrls() {
        val m = ManifestDto(200.0, listOf(
            ChapterDto(1, "B", 0.0, 100.0, 2, "/api/books/files/2/content?grant=y"),
            ChapterDto(0, "A", 0.0, 100.0, 1, "/api/books/files/1/content?grant=x"),
        ))
        val items = buildPlaylist("https://s.tld", m)
        assertEquals(listOf(0, 1), items.map { it.chapterIndex })
        assertEquals("A", items[0].title)
        assertEquals("https://s.tld/api/books/files/1/content?grant=x", items[0].mediaUri)
    }
}
