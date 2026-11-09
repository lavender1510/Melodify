package dev.lyvt.melodify

import dev.lyvt.melodify.data.*
import org.junit.Assert.*
import org.junit.Test

class LibraryRulesTest {
    private fun track(id: String, title: String = "Déjà vu", artist: String = "Björk") =
        Track(
            id,
            "content://music/$id.mp3",
            "test",
            title,
            artist,
            album = "Straße",
            format = "MP3",
        )

    @Test
    fun searchMatchesAcrossFieldsAndAccents() {
        assertTrue(matchesSearch(track("a"), "deja bjork strasse mp3"))
        assertFalse(matchesSearch(track("a"), "missing"))
        assertTrue(matchesSearch(track("a"), "  "))
    }

    @Test
    fun queueMovesRetainDuplicateEntries() {
        val before = listOf("a", "b", "a", "missing")
        assertEquals(listOf("b", "a", "missing", "a"), moved(before, 0, 3))
        assertEquals(before, moved(before, -1, 1))
        assertEquals(4, before.size)
    }

    @Test
    fun importedPlaylistRetainsOrderAndDoesNotGuessAmbiguousPaths() {
        val tracks = listOf(track("a"), track("b"))
        val parsed =
            parsePlaylist(
                "\uFEFF#EXTM3U\ncontent://music/b.mp3\nC:\\Music\\a.mp3\nhttps://example.test/song.mp3\nmissing.mp3",
                tracks,
            )
        assertEquals(listOf("b", "a"), parsed.ids)
        assertEquals(2, parsed.unmatched)
    }

    @Test
    fun duplicateUriIdsAreStable() {
        assertEquals(idFor("content://test/a"), idFor("content://test/a"))
        assertNotEquals(idFor("content://test/a"), idFor("content://test/b"))
        assertEquals(24, idFor("x").length)
    }

    @Test
    fun largeCatalogSearch() {
        val tracks =
            (0 until 50_000).map {
                track(it.toString(), "Song $it", if (it % 10 == 0) "Björk" else "Andere")
            }
        val start = System.nanoTime()
        assertEquals(5000, filterTracks(tracks, "bjork mp3").size)
        println("50000-entry search ms=" + (System.nanoTime() - start) / 1_000_000)
    }

    @Test
    fun mergePreservesFavoritesAndStatisticsChangedWhileScanning() {
        val current =
            track("a")
                .copy(
                    source = "test",
                    favorite = true,
                    playCount = 9,
                    heardMs = 42000,
                    lastPlayed = 123,
                )
        val stale = track("a").copy(source = "test", title = "Neu gelesen")
        val merged = mergeLibrary("test", listOf(stale), listOf(current)).single()
        assertTrue(merged.favorite)
        assertEquals(9, merged.playCount)
        assertEquals(42000L, merged.heardMs)
        assertEquals("Neu gelesen", merged.title)
    }

    @Test
    fun metadataFailureAndMissingScanRetainKnownInformation() {
        val current = track("a").copy(source = "test", favorite = true)
        val damaged = current.copy(title = "fallback", metadataError = "Decode")
        assertEquals(
            current.title,
            mergeLibrary("test", listOf(damaged), listOf(current)).single().title,
        )
        val missing = mergeLibrary("test", emptyList(), listOf(current)).single()
        assertTrue(missing.missing)
        assertTrue(missing.favorite)
    }
}
