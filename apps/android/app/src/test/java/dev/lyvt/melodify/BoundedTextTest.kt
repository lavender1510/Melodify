package dev.lyvt.melodify

import dev.lyvt.melodify.data.readLimited
import org.junit.Assert.assertEquals
import org.junit.Test

class BoundedTextTest {
    @Test
    fun boundedImportRetainsValidText() {
        assertEquals("Text", "Text".reader().readLimited(4))
    }

    @Test(expected = IllegalArgumentException::class)
    fun hugeInputIsRejectedBeforeImport() {
        "12345".reader().readLimited(4)
    }
}
