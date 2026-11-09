package dev.lyvt.melodify.data

import android.Manifest
import android.content.*
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.*
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import java.security.MessageDigest
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow

fun idFor(uri: String) =
    MessageDigest.getInstance("SHA-256")
        .digest(uri.toByteArray())
        .joinToString("") { "%02x".format(it) }
        .take(24)

val audioExtensions = setOf("mp3", "flac", "wav", "ogg", "oga", "opus", "aac", "m4a")

data class ScanState(
    val running: Boolean = false,
    val current: Int = 0,
    val message: String = "",
    val error: String? = null,
)

class LibraryRepository(
    private val context: Context,
    private val db: MusicDatabase,
    private val scope: CoroutineScope,
) {
    val status = MutableStateFlow(ScanState())
    private var scanJob: Job? = null
    private var observer: ContentObserver? = null
    private var refreshJob: Job? = null
    private val dao = db.music()

    fun hasPermission() =
        ContextCompat.checkSelfPermission(
            context,
            if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_AUDIO
            else Manifest.permission.READ_EXTERNAL_STORAGE,
        ) == PackageManager.PERMISSION_GRANTED

    fun scan() {
        if (scanJob?.isActive == true) return
        scanJob = scope.launch {
            status.value = ScanState(true)
            try {
                withContext(Dispatchers.IO) {
                    val sources = dao.allSources().filter { it.enabled }
                    if (hasPermission()) scanSource("mediastore") { readMediaStore() }
                    for (source in sources) {
                        ensureActive()
                        try {
                            scanSource(source.uri) { readTree(source.uri) }
                            dao.saveSource(
                                source.copy(scannedAt = System.currentTimeMillis(), error = null)
                            )
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            dao.saveSource(
                                source.copy(error = e.localizedMessage ?: "Ordner nicht lesbar")
                            )
                            throw e
                        }
                    }
                }
                status.value = ScanState(message = "Bibliothek aktualisiert")
            } catch (e: CancellationException) {
                status.value =
                    ScanState(
                        message = "Scan abgebrochen. Nicht abgeschlossene Quelle unverändert."
                    )
                throw e
            } catch (e: Exception) {
                status.value =
                    ScanState(
                        error = e.localizedMessage ?: "Bibliothek konnte nicht gelesen werden."
                    )
            }
        }
    }

    private suspend fun scanSource(source: String, read: suspend () -> List<Track>) {
        val found = withTimeout(120_000) { read() }
        currentCoroutineContext().ensureActive()
        dao.mergeScan(source, found)
    }

    fun cancel() {
        scanJob?.cancel()
    }

    suspend fun addTree(uri: Uri) {
        context.contentResolver.takePersistableUriPermission(
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION,
        )
        dao.saveSource(
            Source(uri.toString(), DocumentFile.fromTreeUri(context, uri)?.name ?: "Musikordner")
        )
        scan()
    }

    suspend fun removeSource(source: Source) {
        dao.deleteSource(
            source
        ) /* Keep read grants for retained playlist tracks; no file deletion. */
    }

    fun watch(enabled: Boolean) {
        observer?.let { context.contentResolver.unregisterContentObserver(it) }
        observer = null
        if (enabled) {
            observer =
                object : ContentObserver(Handler(Looper.getMainLooper())) {
                    override fun onChange(selfChange: Boolean) {
                        refreshJob?.cancel()
                        refreshJob = scope.launch {
                            delay(1200)
                            scan()
                        }
                    }
                }
            context.contentResolver.registerContentObserver(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                true,
                observer!!,
            )
        }
    }

    private suspend fun readMediaStore(): List<Track> {
        val result = mutableListOf<Track>()
        val volumes = MediaStore.getExternalVolumeNames(context)
        for (volume in volumes) {
            val collection = MediaStore.Audio.Media.getContentUri(volume)
            val columns =
                mutableListOf(
                    "_id",
                    "title",
                    "artist",
                    "album",
                    "duration",
                    "_size",
                    "year",
                    "mime_type",
                    "date_added",
                    "album_id",
                    "_display_name",
                )
            if (Build.VERSION.SDK_INT >= 30) columns.add("genre")
            val cursor =
                context.contentResolver.query(
                    collection,
                    columns.toTypedArray(),
                    "is_music != 0",
                    null,
                    null,
                ) ?: error("Medienspeicher antwortet nicht")
            cursor.use { c ->
                fun text(name: String) =
                    c.getColumnIndex(name).takeIf { it >= 0 }?.let { c.getString(it) }.orEmpty()
                while (c.moveToNext()) {
                    currentCoroutineContext().ensureActive()
                    val uri =
                        ContentUris.withAppendedId(collection, text("_id").toLong()).toString()
                    val ext = text("_display_name").substringAfterLast('.', "").lowercase()
                    result +=
                        Track(
                                idFor(uri),
                                uri,
                                "mediastore",
                                text("title").ifBlank { text("_display_name") },
                                text("artist").takeUnless { it.isBlank() || it == "<unknown>" }
                                    ?: "Unbekannter Interpret",
                                text("album").ifBlank { "Unbekanntes Album" },
                                text("genre"),
                                text("year").toIntOrNull() ?: 0,
                                text("duration").toLongOrNull() ?: 0,
                                text("_size").toLongOrNull() ?: text("size").toLongOrNull() ?: 0,
                                ext.uppercase(),
                                (text("date_added").toLongOrNull() ?: 0) * 1000,
                                "content://media/$volume/audio/albumart/${text("album_id")}",
                            )
                            .copy(fileName = text("_display_name"))
                    if (result.size % 100 == 0)
                        status.value = ScanState(true, result.size, "Medienspeicher wird gelesen")
                }
            }
        }
        return result
    }

    private suspend fun readTree(value: String): List<Track> {
        val root =
            DocumentFile.fromTreeUri(context, Uri.parse(value)) ?: error("Ordnerfreigabe ungültig")
        require(root.canRead()) { "Ordnerzugriff fehlt. Bitte den Ordner erneut auswählen." }
        val result = mutableListOf<Track>()
        val pending = ArrayDeque<DocumentFile>()
        pending.add(root)
        val visited = mutableSetOf<String>()
        while (pending.isNotEmpty()) {
            currentCoroutineContext().ensureActive()
            val folder = pending.removeFirst()
            if (!visited.add(folder.uri.toString())) continue
            require(folder.canRead()) { "Unterordner nicht lesbar: ${folder.name}" }
            for (file in children(folder)) {
                currentCoroutineContext().ensureActive()
                if (file.isDirectory) pending.add(file)
                else if (
                    file.name.orEmpty().substringAfterLast('.', "").lowercase() in audioExtensions
                ) {
                    result += readDocument(file, value)
                    status.value = ScanState(true, result.size, "${file.name}")
                }
            }
            require(visited.size < 150000) {
                "Zu viele Unterordner. Bitte kleinere Quellen auswählen."
            }
        }
        return result
    }

    private fun children(folder: DocumentFile): List<DocumentFile> {
        val childUri =
            android.provider.DocumentsContract.buildChildDocumentsUriUsingTree(
                folder.uri,
                android.provider.DocumentsContract.getDocumentId(folder.uri),
            )
        val cursor =
            context.contentResolver.query(
                childUri,
                arrayOf(android.provider.DocumentsContract.Document.COLUMN_DOCUMENT_ID),
                null,
                null,
                null,
            ) ?: error("Ordnerinhalt nicht lesbar")
        return cursor.use { c ->
            buildList {
                while (c.moveToNext()) {
                    val uri =
                        android.provider.DocumentsContract.buildDocumentUriUsingTree(
                            folder.uri,
                            c.getString(0),
                        )
                    add(DocumentFile.fromSingleUri(context, uri) ?: error("Dateiverweis ungültig"))
                }
            }
        }
    }

    private fun readDocument(file: DocumentFile, source: String): Track {
        val uri = file.uri.toString()
        val base =
            Track(
                idFor(uri),
                uri,
                source,
                file.name.orEmpty().substringBeforeLast('.'),
                size = file.length(),
                format = file.name.orEmpty().substringAfterLast('.', "").uppercase(),
                fileName = file.name.orEmpty(),
            )
        return try {
            MediaMetadataRetriever().use { m ->
                m.setDataSource(context, file.uri)
                fun read(key: Int) = m.extractMetadata(key).orEmpty()
                val title = read(MediaMetadataRetriever.METADATA_KEY_TITLE).ifBlank { base.title }
                val artist =
                    read(MediaMetadataRetriever.METADATA_KEY_ARTIST).ifBlank { base.artist }
                val album = read(MediaMetadataRetriever.METADATA_KEY_ALBUM).ifBlank { base.album }
                val genre = read(MediaMetadataRetriever.METADATA_KEY_GENRE)
                base.copy(
                    title = title,
                    artist = artist,
                    album = album,
                    genre = genre,
                    year = read(MediaMetadataRetriever.METADATA_KEY_YEAR).toIntOrNull() ?: 0,
                    duration =
                        read(MediaMetadataRetriever.METADATA_KEY_DURATION).toLongOrNull() ?: 0,
                    searchText = searchKey("$title $artist $album $genre ${base.format}"),
                )
            }
        } catch (e: Exception) {
            base.copy(metadataError = e.localizedMessage ?: "Metadaten nicht lesbar")
        } // ExoPlayer provides the definitive, visible decoder error.
    }
}
