package dev.lyvt.melodify.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import java.text.Normalizer
import java.util.Locale

@Entity(tableName = "tracks", indices = [Index(value = ["uri"], unique = true), Index("source"), Index("searchText")])
data class Track(
    @PrimaryKey val id: String,
    val uri: String,
    val source: String,
    val title: String,
    val artist: String = "Unbekannter Interpret",
    val album: String = "Unbekanntes Album",
    val genre: String = "",
    val year: Int = 0,
    val duration: Long = 0,
    val size: Long = 0,
    val format: String = "",
    val addedAt: Long = System.currentTimeMillis(),
    val coverUri: String? = null,
    val missing: Boolean = false,
    val favorite: Boolean = false,
    val playCount: Int = 0,
    val heardMs: Long = 0,
    val lastPlayed: Long = 0,
    val searchText: String = searchKey("$title $artist $album $genre $format"),
    val fileName: String = uri.substringAfterLast('/')
)
@Entity(tableName = "playlists")
data class Playlist(@PrimaryKey val id: String, val name: String, val createdAt: Long = System.currentTimeMillis(), val favorite: Boolean = false, val coverUri: String? = null)
@Entity(tableName = "playlist_entries", primaryKeys = ["playlistId", "entryId"], indices = [Index("playlistId")], foreignKeys = [ForeignKey(entity=Playlist::class, parentColumns=["id"], childColumns=["playlistId"], onDelete=ForeignKey.CASCADE)])
data class PlaylistEntry(val playlistId: String, val entryId: String, val trackId: String, val position: Int)
@Entity(tableName = "sources")
data class Source(@PrimaryKey val uri: String, val name: String, val enabled: Boolean = true, val scannedAt: Long = 0, val error: String? = null)

@Dao
interface MusicDao {
    @Query("SELECT * FROM tracks ORDER BY title COLLATE NOCASE") fun tracks(): Flow<List<Track>>
    @Query("SELECT * FROM tracks") suspend fun allTracks(): List<Track>
    @Query("SELECT * FROM tracks WHERE id=:id") suspend fun track(id: String): Track?
    @Upsert suspend fun upsertTracks(tracks: List<Track>)
    @Query("UPDATE tracks SET favorite=NOT favorite WHERE id=:id") suspend fun toggleFavorite(id: String)
    @Query("UPDATE tracks SET missing=1 WHERE id=:id") suspend fun markMissing(id: String)
    @Query("UPDATE tracks SET heardMs=heardMs+:heard, playCount=playCount+:plays, lastPlayed=:now WHERE id=:id") suspend fun recordListening(id: String, heard: Long, plays: Int, now: Long)
    @Query("SELECT * FROM playlists ORDER BY name COLLATE NOCASE") fun playlists(): Flow<List<Playlist>>
    @Query("SELECT * FROM playlists") suspend fun allPlaylists(): List<Playlist>
    @Upsert suspend fun savePlaylist(playlist: Playlist)
    @Delete suspend fun deletePlaylist(playlist: Playlist)
    @Query("SELECT * FROM playlist_entries ORDER BY position") fun entries(): Flow<List<PlaylistEntry>>
    @Query("SELECT * FROM playlist_entries WHERE playlistId=:id ORDER BY position") suspend fun playlistEntries(id: String): List<PlaylistEntry>
    @Insert suspend fun insertEntries(entries: List<PlaylistEntry>)
    @Query("DELETE FROM playlist_entries WHERE playlistId=:id") suspend fun clearEntries(id: String)
    @Transaction suspend fun replaceEntries(id: String, entries: List<PlaylistEntry>) { clearEntries(id); insertEntries(entries.mapIndexed { index, e -> e.copy(playlistId=id, position=index) }) }
    @Query("SELECT * FROM sources") fun sources(): Flow<List<Source>>
    @Query("SELECT * FROM sources") suspend fun allSources(): List<Source>
    @Upsert suspend fun saveSource(source: Source)
    @Delete suspend fun deleteSource(source: Source)
}
@Database(entities=[Track::class, Playlist::class, PlaylistEntry::class, Source::class], version=1, exportSchema=true)
abstract class MusicDatabase: RoomDatabase() { abstract fun music(): MusicDao }
fun searchKey(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFKD).replace(Regex("\\p{M}"), "").lowercase(Locale.GERMAN).replace("ß", "ss").trim()
fun matchesSearch(track: Track, query: String): Boolean = searchKey(query).split(Regex("\\s+")).all { it in track.searchText }
fun <T> moved(items: List<T>, from: Int, to: Int): List<T> = if(from !in items.indices || to !in items.indices) items else items.toMutableList().apply { add(to, removeAt(from)) }
