package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ChapterDto
import org.junit.Assert.assertEquals
import org.junit.Test

class PositionMapTest {
    private fun ch(i: Int, dur: Double) =
        ChapterDto(i, "Ch $i", 0.0, dur, fileId = i, url = "u$i")
    // three 100s chapters
    private val map = PositionMap(listOf(ch(0, 100.0), ch(1, 100.0), ch(2, 100.0)))

    @Test fun totalIsSumOfChapterDurations() {
        assertEquals(300.0, map.totalSecs, 0.0)
    }
    @Test fun globalWithinSecondChapter() {
        assertEquals(150.0, map.toGlobal(1, 50.0), 0.0)
    }
    @Test fun chapterFromGlobalMidSecond() {
        val p = map.toChapter(150.0)
        assertEquals(1, p.chapterIndex)
        assertEquals(50.0, p.offsetInChapterSecs, 0.0)
    }
    @Test fun globalAtExactBoundaryStartsNextChapter() {
        val p = map.toChapter(100.0)
        assertEquals(1, p.chapterIndex)
        assertEquals(0.0, p.offsetInChapterSecs, 0.0)
    }
    @Test fun clampsBelowZero() {
        val p = map.toChapter(-5.0)
        assertEquals(0, p.chapterIndex); assertEquals(0.0, p.offsetInChapterSecs, 0.0)
    }
    @Test fun clampsAboveTotalToLastChapterEnd() {
        val p = map.toChapter(999.0)
        assertEquals(2, p.chapterIndex); assertEquals(100.0, p.offsetInChapterSecs, 0.0)
    }
}
