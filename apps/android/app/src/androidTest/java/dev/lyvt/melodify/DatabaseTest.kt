package dev.lyvt.melodify

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import dev.lyvt.melodify.data.*
import kotlinx.coroutines.runBlocking
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DatabaseTest {
    @Test fun transactionsPreserveOrderFavoritesAndMissingReferences()=runBlocking {
        val db=Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(),MusicDatabase::class.java).build()
        try {
            val dao=db.music();val track=Track("t","content://test/track","test","Song",favorite=true)
            dao.upsertTracks(listOf(track));val p=Playlist("p","Meine Liste");dao.savePlaylist(p)
            dao.replaceEntries("p",listOf(PlaylistEntry("p","first","t",0),PlaylistEntry("p","second","missing",1),PlaylistEntry("p","third","t",2)))
            dao.replaceEntries("p",moved(dao.playlistEntries("p"),0,2))
            assertEquals(listOf("second","third","first"),dao.playlistEntries("p").map { it.entryId })
            dao.markMissing("t");assertTrue(dao.track("t")!!.missing);assertTrue(dao.track("t")!!.favorite)
            assertEquals(3,dao.playlistEntries("p").size);dao.deletePlaylist(p);assertTrue(dao.playlistEntries("p").isEmpty());assertNotNull(dao.track("t"))
        } finally { db.close() }
    }
}
