package dev.lyvt.melodify.playback

import android.app.PendingIntent
import android.content.Intent
import android.os.Process
import androidx.media3.common.*
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.*
import dev.lyvt.melodify.*
import dev.lyvt.melodify.data.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first

fun Track.mediaItem(): MediaItem =
    MediaItem.Builder()
        .setMediaId(id)
        .setUri(uri)
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist)
                .setAlbumTitle(album)
                .setArtworkUri(coverUri?.let(android.net.Uri::parse))
                .build()
        )
        .build()

@androidx.annotation.OptIn(markerClass = [androidx.media3.common.util.UnstableApi::class])
class PlaybackService : MediaSessionService() {
    private lateinit var player: ExoPlayer
    private var session: MediaSession? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val app
        get() = application as MelodifyApplication

    private var totalHeard = 0L
    private var ticks = 0
    private var heard = 0L
    private var counted = false
    private var lastId: String? = null
    private var sleepJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        player =
            ExoPlayer.Builder(this)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(C.USAGE_MEDIA)
                        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                        .build(),
                    true,
                )
                .setHandleAudioBecomingNoisy(true)
                .setWakeMode(C.WAKE_MODE_LOCAL)
                .build()
        val pending =
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
        session =
            MediaSession.Builder(this, player)
                .setSessionActivity(pending)
                .setCallback(
                    object : MediaSession.Callback {
                        override fun onConnect(
                            session: MediaSession,
                            controller: MediaSession.ControllerInfo,
                        ): MediaSession.ConnectionResult {
                            val base = super.onConnect(session, controller)
                            if (controller.uid == Process.myUid()) return base
                            return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                                .setAvailablePlayerCommands(
                                    base.availablePlayerCommands
                                        .buildUpon()
                                        .remove(Player.COMMAND_CHANGE_MEDIA_ITEMS)
                                        .remove(Player.COMMAND_SET_MEDIA_ITEM)
                                        .build()
                                )
                                .build()
                        }
                    }
                )
                .build()
        player.addListener(
            object : Player.Listener {
                override fun onEvents(player: Player, events: Player.Events) {
                    if (player.playbackState == Player.STATE_ENDED && app.sleepTimer.value == -1L)
                        app.sleepTimer.value = 0
                    if (
                        events.containsAny(
                            Player.EVENT_PLAYBACK_STATE_CHANGED,
                            Player.EVENT_PLAY_WHEN_READY_CHANGED,
                            Player.EVENT_TIMELINE_CHANGED,
                            Player.EVENT_POSITION_DISCONTINUITY,
                            Player.EVENT_REPEAT_MODE_CHANGED,
                            Player.EVENT_SHUFFLE_MODE_ENABLED_CHANGED,
                        )
                    )
                        checkpoint()
                }

                override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                    if (
                        (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO ||
                            reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) &&
                            app.sleepTimer.value == -1L
                    ) {
                        player.pause()
                        app.sleepTimer.value = 0
                    }
                    finishListening()
                    lastId = mediaItem?.mediaId
                    heard = 0
                    totalHeard = 0
                    counted = false
                }

                override fun onPlayerError(error: PlaybackException) {
                    app.playbackError.value =
                        "Titel nicht abspielbar: ${error.errorCodeName}. Datei, Freigabe oder Geräte-Codec prüfen. Du kannst einen anderen Titel wählen."
                    if (error.errorCode == PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND)
                        player.currentMediaItem?.mediaId?.let { id ->
                            scope.launch(Dispatchers.IO) { app.database.music().markMissing(id) }
                        }
                }

                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying) app.playbackError.value = null
                }
            }
        )
        scope.launch {
            try {
                val saved = app.preferences.session()
                val items =
                    withContext(Dispatchers.IO) {
                        saved?.ids?.mapNotNull { app.database.music().track(it)?.mediaItem() }
                            ?: emptyList()
                    }
                // A user/controller may already have chosen a queue while the disk was read.
                if (player.mediaItemCount == 0 && items.isNotEmpty() && saved != null) {
                    player.setMediaItems(
                        items,
                        saved.index.coerceAtMost(items.lastIndex),
                        saved.position,
                    )
                    player.repeatMode = saved.repeat
                    player.shuffleModeEnabled = saved.shuffle
                    // No prepare or autoplay on restore: foreground starts only on user play.
                }
            } catch (e: Exception) {
                app.playbackError.value =
                    "Sitzung konnte nicht wiederhergestellt werden: ${e.localizedMessage}"
            }
        }
        scope.launch {
            while (isActive) {
                delay(1000)
                if (player.isPlaying) {
                    heard += 1000
                    totalHeard += 1000
                }
                if (
                    !counted &&
                        totalHeard >=
                            if (player.duration > 0)
                                minOf(30_000, player.duration / 2).coerceAtLeast(1000)
                            else 30_000
                ) {
                    counted = true
                    persistListening(1)
                }
                if (heard >= 5000) persistListening(0)
                if (++ticks % 5 == 0) checkpoint()
            }
        }
        scope.launch {
            app.sleepTimer.collect { deadline ->
                sleepJob?.cancel()
                if (deadline > 0)
                    sleepJob = scope.launch {
                        delay((deadline - System.currentTimeMillis()).coerceAtLeast(0))
                        player.pause()
                        app.sleepTimer.value = 0
                    }
            }
        }
        scope.launch {
            app.preferences.settings.collect { settings ->
                AudioEffects.apply(player.audioSessionId, settings, app)
            }
        }
        player.addListener(
            object : Player.Listener {
                override fun onAudioSessionIdChanged(audioSessionId: Int) {
                    scope.launch {
                        AudioEffects.apply(
                            audioSessionId,
                            app.preferences.settings.firstValue(),
                            app,
                        )
                    }
                }
            }
        )
    }

    private fun persistListening(plays: Int) {
        val id = lastId ?: return
        val delta = heard
        heard = 0
        app.appScope.launch(Dispatchers.IO) {
            app.database.music().recordListening(id, delta, plays, System.currentTimeMillis())
        }
    }

    private fun finishListening() {
        if (heard > 0) persistListening(0)
    }

    private fun checkpoint() {
        if (player.mediaItemCount == 0) return
        val snapshot =
            PlaybackSnapshot(
                (0 until player.mediaItemCount).map { player.getMediaItemAt(it).mediaId },
                player.currentMediaItemIndex.coerceAtLeast(0),
                player.currentPosition,
                player.repeatMode,
                player.shuffleModeEnabled,
            )
        app.appScope.launch {
            try {
                app.preferences.saveSession(snapshot)
            } catch (e: Exception) {
                app.playbackError.value =
                    "Sitzung konnte nicht gespeichert werden: ${e.localizedMessage}"
            }
        }
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? =
        if (controllerInfo.uid == Process.myUid() || controllerInfo.isTrusted) session else null

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!player.playWhenReady) {
            checkpoint()
            stopSelf()
        }
    }

    override fun onDestroy() {
        checkpoint()
        finishListening()
        session?.release()
        player.release()
        AudioEffects.release()
        sleepJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }
}

private suspend fun kotlinx.coroutines.flow.Flow<UserSettings>.firstValue() = this.first()
