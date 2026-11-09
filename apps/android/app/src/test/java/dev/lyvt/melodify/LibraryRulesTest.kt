package dev.lyvt.melodify

import dev.lyvt.melodify.data.*
import org.junit.Assert.*
import org.junit.Test

class LibraryRulesTest {
    private fun track(id: String,title: String="Déjà vu",artist: String="Björk")=Track(id,"content://music/$id.mp3","test",title,artist,album="Straße",format="MP3")
    @Test fun searchMatchesAcrossFieldsAndAccents() { assertTrue(matchesSearch(track("a"),"deja bjork strasse mp3"));assertFalse(matchesSearch(track("a"),"missing"));assertTrue(matchesSearch(track("a"),"  ")) }
    @Test fun queueMovesRetainDuplicateEntries() { val before=listOf("a","b","a","missing");assertEquals(listOf("b","a","missing","a"),moved(before,0,3));assertEquals(before,moved(before,-1,1));assertEquals(4,before.size) }
    @Test fun importedPlaylistRetainsOrderAndDoesNotGuessAmbiguousPaths() { val tracks=listOf(track("a"),track("b"));val parsed=parsePlaylist("\uFEFF#EXTM3U\ncontent://music/b.mp3\nC:\\Music\\a.mp3\nhttps://example.test/song.mp3\nmissing.mp3",tracks);assertEquals(listOf("b","a"),parsed.ids);assertEquals(2,parsed.unmatched) }
    @Test fun duplicateUriIdsAreStable() { assertEquals(idFor("content://test/a"),idFor("content://test/a"));assertNotEquals(idFor("content://test/a"),idFor("content://test/b"));assertEquals(24,idFor("x").length) }
    @Test fun largeCatalogSearch() { val tracks=(0 until 50_000).map { track(it.toString(),"Song $it",if(it%10==0)"Björk" else "Andere") };val start=System.nanoTime();assertEquals(5000,tracks.count { matchesSearch(it,"bjork mp3") });println("50000-entry search ms="+(System.nanoTime()-start)/1_000_000) }
}
