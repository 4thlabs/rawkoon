package cloud.samlo.rawkoontv.data

import kotlinx.serialization.decodeFromString
import org.junit.Assert.assertEquals
import org.junit.Test

class ModelsTest {
    @Test fun parsesManifestWithSnakeCaseAndUnknownFields() {
        val raw = """
        {"total_duration_secs": 3600.0, "extra": "ignored",
         "chapters": [
           {"index":0,"title":"Ch 1","start_secs":0.0,"end_secs":1800.0,
            "file_id":11,"size_bytes":123,"sha256":"a","url":"/api/books/files/11/content?grant=x"}
         ]}
        """.trimIndent()
        val m = json.decodeFromString<ManifestDto>(raw)
        assertEquals(3600.0, m.totalDurationSecs, 0.0)
        assertEquals(1, m.chapters.size)
        assertEquals(11, m.chapters[0].fileId)
        assertEquals("/api/books/files/11/content?grant=x", m.chapters[0].url)
    }

    @Test fun parsesProgressList() {
        val raw = """[{"edition_id":7,"position_secs":42.5,"total_duration_secs":100.0,"finished":false}]"""
        val list = json.decodeFromString<List<ProgressDto>>(raw)
        assertEquals(7, list[0].editionId)
        assertEquals(42.5, list[0].positionSecs, 0.0)
    }
}
