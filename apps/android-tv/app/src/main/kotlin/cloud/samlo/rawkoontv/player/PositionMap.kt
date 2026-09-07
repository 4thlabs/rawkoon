package cloud.samlo.rawkoontv.player

import cloud.samlo.rawkoontv.data.ChapterDto

data class ChapterPosition(val chapterIndex: Int, val offsetInChapterSecs: Double)

class PositionMap(chaptersIn: List<ChapterDto>) {
    // Sort by index so global<->chapter math matches buildPlaylist's media order.
    private val chapters = chaptersIn.sortedBy { it.index }
    private val durations = chapters.map { it.endSecs - it.startSecs }
    private val starts = durations.runningFold(0.0) { acc, d -> acc + d } // size n+1
    val totalSecs: Double = starts.last()

    fun toGlobal(chapterIndex: Int, offsetInChapterSecs: Double): Double =
        starts[chapterIndex] + offsetInChapterSecs

    fun toChapter(globalSecs: Double): ChapterPosition {
        if (chapters.isEmpty()) return ChapterPosition(0, 0.0)
        if (globalSecs <= 0.0) return ChapterPosition(0, 0.0)
        if (globalSecs >= totalSecs)
            return ChapterPosition(chapters.lastIndex, durations.last())
        var i = 0
        while (i < chapters.lastIndex && globalSecs >= starts[i + 1]) i++
        return ChapterPosition(i, globalSecs - starts[i])
    }
}
