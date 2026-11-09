package dev.lyvt.melodify

import dev.lyvt.melodify.data.*
import org.junit.Assert.*
import org.junit.Test

class LyricsTest {
    @Test
    fun timestampsOffsetsAndRepeatedLines() {
        val lines = parseLyrics("[offset:-100]\n[00:01.20][00:03.005]Hallo\n[00:02]Welt")
        assertEquals(listOf(1100L, 1900L, 2905L), lines.map { it.timeMs })
        assertEquals("Hallo", lines.last().text)
    }

    @Test
    fun plainTextIsNotDiscarded() {
        assertEquals(listOf("Eins", "Zwei"), parseLyrics("Eins\nZwei").map { it.text })
        assertTrue(parseLyrics("[ar:Artist]\n").isEmpty())
    }
}
