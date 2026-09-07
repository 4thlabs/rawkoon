package cloud.samlo.rawkoontv.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UrlsTest {
    @Test fun keepsAbsolute() {
        assertEquals("https://img/x.jpg", resolveUrl("https://s.tld", "https://img/x.jpg"))
    }
    @Test fun joinsRelative() {
        assertEquals("https://s.tld/api/books/files/1/content?grant=x",
            resolveUrl("https://s.tld", "/api/books/files/1/content?grant=x"))
    }
    @Test fun stripsDoubleSlash() {
        assertEquals("https://s.tld/a", resolveUrl("https://s.tld/", "/a"))
    }
    @Test fun nullOnBlank() { assertNull(resolveUrl("https://s.tld", "")) }
}
