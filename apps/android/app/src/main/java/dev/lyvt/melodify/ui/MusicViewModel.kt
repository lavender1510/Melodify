package dev.lyvt.melodify.ui

import android.app.Application
import android.content.ComponentName
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.*
import androidx.media3.session.*
import androidx.room.withTransaction
import dev.lyvt.melodify.*
import dev.lyvt.melodify.data.*
import dev.lyvt.melodify.playback.*
import java.util.UUID
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

data class PlaybackUi(
    val current: MediaItem? = null,
    val queue: List<MediaItem> = emptyList(),
    val index: Int = 0,
    val playing: Boolean = false,
    val position: Long = 0,
    val duration: Long = 0,
    val repeat: Int = 0,
    val shuffle: Boolean = false,
)

@androidx.annotation.OptIn(markerClass = [androidx.media3.common.util.UnstableApi::class])
class MusicViewModel(application: Application) : AndroidViewModel(application) {
    val app = application as MelodifyApplication
    val dao = app.database.music()
    val tracks =
        dao.tracks()
            .catch {
                message.value = "Musikdatenbank nicht lesbar. Vorhandene Daten bleiben erhalten."
                emit(emptyList())
            }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val playlists =
        dao.playlists()
            .catch {
                message.value = "Playlists nicht lesbar"
                emit(emptyList())
            }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val entries =
        dao.entries()
            .catch {
                message.value = "Playlist-Reihenfolge nicht lesbar"
                emit(emptyList())
            }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val sources =
        dao.sources()
            .catch {
                message.value = "Musikquellen nicht lesbar"
                emit(emptyList())
            }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val settings =
        app.preferences.settings
            .catch { message.value = "Einstellungen nicht lesbar: ${it.localizedMessage}" }
            .stateIn(viewModelScope, SharingStarted.Eagerly, UserSettings())
    val lyrics = MutableStateFlow<List<LyricLine>>(emptyList())
    val playback = MutableStateFlow(PlaybackUi())
    val message = MutableStateFlow<String?>(null)
    private var controller: MediaController? = null
    private val future =
        MediaController.Builder(
                application,
                SessionToken(application, ComponentName(application, PlaybackService::class.java)),
            )
            .buildAsync()
    val query = MutableStateFlow("")
    val sort = MutableStateFlow("Titel")
    @OptIn(FlowPreview::class)
    val results =
        combine(tracks, query.debounce(150), sort) { tracks, query, sort ->
                val filtered = filterTracks(tracks, query)
                when (sort) {
                    "Künstler" -> filtered.sortedBy { it.artist.lowercase() }
                    "Album" -> filtered.sortedBy { it.album.lowercase() }
                    "Dauer" -> filtered.sortedByDescending { it.duration }
                    "Neueste" -> filtered.sortedByDescending { it.addedAt }
                    else -> filtered.sortedBy { it.title.lowercase() }
                }
            }
            .flowOn(Dispatchers.Default)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        future.addListener(
            {
                try {
                    controller = future.get()
                    controller?.addListener(
                        object : Player.Listener {
                            override fun onEvents(player: Player, events: Player.Events) {
                                refreshPlayer()
                            }
                        }
                    )
                    refreshPlayer()
                } catch (e: Exception) {
                    message.value = "Player konnte nicht verbunden werden: ${e.localizedMessage}"
                }
            },
            ContextCompat.getMainExecutor(application),
        )
        viewModelScope.launch {
            while (isActive) {
                delay(500)
                refreshPlayer()
            }
        }
        viewModelScope.launch {
            playback
                .map { it.current?.mediaId }
                .distinctUntilChanged()
                .collect { id ->
                    lyrics.value =
                        withContext(Dispatchers.IO) {
                            id?.let {
                                java.io
                                    .File(app.filesDir, "lyrics/$it.lrc")
                                    .takeIf(java.io.File::exists)
                                    ?.readText()
                                    ?.let(::parseLyrics)
                            } ?: emptyList()
                        }
                }
        }
        viewModelScope.launch {
            settings.map { it.autoScan }.distinctUntilChanged().collect { app.library.watch(it) }
        }
    }

    private fun refreshPlayer() {
        controller?.let { p ->
            playback.value =
                PlaybackUi(
                    p.currentMediaItem,
                    (0 until p.mediaItemCount).map(p::getMediaItemAt),
                    p.currentMediaItemIndex.coerceAtLeast(0),
                    p.isPlaying,
                    p.currentPosition.coerceAtLeast(0),
                    p.duration.coerceAtLeast(0),
                    p.repeatMode,
                    p.shuffleModeEnabled,
                )
        }
    }

    fun play(list: List<Track>, index: Int = 0) {
        val available = list.filter { !it.missing }
        if (available.isEmpty()) {
            message.value = "Keine verfügbaren Dateien in dieser Auswahl"
            return
        }
        val chosen = list.getOrNull(index)?.id
        val start = available.indexOfFirst { it.id == chosen }.coerceAtLeast(0)
        controller?.let {
            it.setMediaItems(available.map(Track::mediaItem), start, 0)
            it.prepare()
            it.play()
        } ?: run { message.value = "Player wird noch verbunden" }
    }

    fun toggle() {
        controller?.let {
            if (it.isPlaying) it.pause()
            else {
                if (it.playbackState == Player.STATE_IDLE) it.prepare()
                it.play()
            }
        }
    }

    fun next() {
        controller?.seekToNextMediaItem()
    }

    fun previous() {
        controller?.seekToPreviousMediaItem()
    }

    fun seek(value: Long) {
        controller?.seekTo(value)
    }

    fun shuffle() {
        controller?.let { it.shuffleModeEnabled = !it.shuffleModeEnabled }
    }

    fun repeat() {
        controller?.let { it.repeatMode = (it.repeatMode + 1) % 3 }
    }

    fun enqueue(track: Track, next: Boolean = false) {
        controller?.let {
            it.addMediaItem(
                if (next) (it.currentMediaItemIndex + 1).coerceAtLeast(0) else it.mediaItemCount,
                track.mediaItem(),
            )
            refreshPlayer()
        }
    }

    fun moveQueue(from: Int, to: Int) {
        controller?.let {
            if (from in 0 until it.mediaItemCount && to in 0 until it.mediaItemCount)
                it.moveMediaItem(from, to)
        }
    }

    fun removeQueue(index: Int) {
        controller?.removeMediaItem(index)
    }

    fun clearQueue() {
        controller?.clearMediaItems()
        launch { app.preferences.saveSession(PlaybackSnapshot(emptyList(), 0, 0, 0, false)) }
    }

    fun queuePlay(index: Int) {
        controller?.let {
            it.seekToDefaultPosition(index)
            it.prepare()
            it.play()
        }
    }

    fun favorite(track: Track) = launch { dao.toggleFavorite(track.id) }

    fun createPlaylist(name: String) = launch {
        dao.savePlaylist(Playlist(UUID.randomUUID().toString(), name.trim().take(100)))
    }

    fun savePlaylist(playlist: Playlist) = launch { dao.savePlaylist(playlist) }

    fun deletePlaylist(playlist: Playlist) = launch { dao.deletePlaylist(playlist) }

    fun addToPlaylist(track: Track, playlist: Playlist) = launch {
        app.database.withTransactionCompat {
            val old = dao.playlistEntries(playlist.id)
            dao.replaceEntries(
                playlist.id,
                old + PlaylistEntry(playlist.id, UUID.randomUUID().toString(), track.id, old.size),
            )
        }
    }

    fun removeEntry(playlist: Playlist, index: Int) = launch {
        app.database.withTransactionCompat {
            dao.replaceEntries(
                playlist.id,
                dao.playlistEntries(playlist.id).filterIndexed { i, _ -> i != index },
            )
        }
    }

    fun moveEntry(playlist: Playlist, from: Int, to: Int) = launch {
        app.database.withTransactionCompat {
            dao.replaceEntries(playlist.id, moved(dao.playlistEntries(playlist.id), from, to))
        }
    }

    fun duplicate(playlist: Playlist) = launch {
        val copy =
            playlist.copy(
                id = UUID.randomUUID().toString(),
                name = playlist.name + " (Kopie)",
                createdAt = System.currentTimeMillis(),
            )
        app.database.withTransactionCompat {
            dao.savePlaylist(copy)
            dao.replaceEntries(
                copy.id,
                dao.playlistEntries(playlist.id).map { it.copy(playlistId = copy.id) },
            )
        }
    }

    fun updateSettings(value: UserSettings) = launch { app.preferences.update(value) }

    fun addTree(uri: Uri) = launch { app.library.addTree(uri) }

    fun importLyrics(uri: Uri, id: String) =
        launch(Dispatchers.IO) {
            require(id.matches(Regex("[a-f0-9]{24}")))
            val text =
                app.contentResolver.openInputStream(uri)?.bufferedReader()?.use {
                    it.readLimited(500_000)
                } ?: error("Songtext nicht lesbar")
            val lines = parseLyrics(text)
            require(lines.isNotEmpty()) { "Keine Textzeilen gefunden" }
            val file = java.io.File(app.filesDir, "lyrics/$id.lrc")
            file.parentFile?.mkdirs()
            file.writeText(text)
            if (playback.value.current?.mediaId == id) lyrics.value = lines
        }

    fun importPlaylist(uri: Uri) =
        launch(Dispatchers.IO) {
            val text =
                app.contentResolver.openInputStream(uri)?.bufferedReader()?.use {
                    it.readLimited(8_000_000)
                } ?: error("Playlist nicht lesbar")
            val known = dao.allTracks()
            val result = parsePlaylist(text, known)
            val playlist =
                Playlist(UUID.randomUUID().toString(), "Import ${System.currentTimeMillis()}")
            app.database.withTransactionCompat {
                dao.savePlaylist(playlist)
                dao.replaceEntries(
                    playlist.id,
                    result.ids.mapIndexed { i, id ->
                        PlaylistEntry(playlist.id, UUID.randomUUID().toString(), id, i)
                    },
                )
            }
            message.value =
                "${result.ids.size} Titel importiert; ${result.unmatched} nicht zugeordnet."
        }

    fun exportPlaylist(uri: Uri, playlist: Playlist) =
        launch(Dispatchers.IO) {
            val tracks = dao.allTracks().associateBy { it.id }
            val content = buildString {
                append("#EXTM3U\n")
                dao.playlistEntries(playlist.id).forEach { e ->
                    tracks[e.trackId]?.let {
                        append(
                            "#EXTINF:${it.duration/1000},${it.artist.replace('\n',' ')} - ${it.title.replace('\n',' ')}\n${it.uri}\n"
                        )
                    }
                }
            }
            app.contentResolver.openOutputStream(uri, "wt")?.bufferedWriter()?.use {
                it.write(content)
            } ?: error("Export nicht möglich")
            message.value = "Playlist exportiert. Android-URIs sind gerätegebunden."
        }

    fun launch(dispatcher: CoroutineDispatcher = Dispatchers.Main, block: suspend () -> Unit) =
        viewModelScope.launch(dispatcher) {
            try {
                block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                message.value = e.localizedMessage ?: "Vorgang fehlgeschlagen"
            }
        }

    override fun onCleared() {
        MediaController.releaseFuture(future)
        super.onCleared()
    }
}

suspend fun <T> MusicDatabase.withTransactionCompat(block: suspend () -> T): T =
    this.withTransaction { block() }
