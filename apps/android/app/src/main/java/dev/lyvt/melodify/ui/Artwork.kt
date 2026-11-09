package dev.lyvt.melodify.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import dev.lyvt.melodify.data.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext

private val coverCache =
    object : LruCache<String, Bitmap>(12 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }
private val missingCovers = LruCache<String, Boolean>(1024)

private val coverLoads = Semaphore(2)

suspend fun loadImage(context: Context, uri: String, trackUri: String? = null): Bitmap? =
    coverLoads.withPermit {
        withContext(Dispatchers.IO) {
            coverCache.get(uri)?.let {
                return@withContext it
            }
            if (missingCovers.get(uri) == true) return@withContext null
            val bytes =
                (if (uri != trackUri)
                    runCatching {
                        context.contentResolver.openInputStream(Uri.parse(uri))?.use { input ->
                            val out = java.io.ByteArrayOutputStream()
                            val buffer = ByteArray(8192)
                            var read = input.read(buffer)
                            while (read != -1) {
                                if (out.size() + read > 12 * 1024 * 1024)
                                    throw java.io.IOException("Bild größer als 12 MB")
                                out.write(buffer, 0, read)
                                read = input.read(buffer)
                            }
                            out.toByteArray()
                        }
                    }
                        .getOrNull()
                else null)
                    ?: trackUri?.let {
                        runCatching {
                            MediaMetadataRetriever().use { r ->
                                r.setDataSource(context, Uri.parse(it))
                                r.embeddedPicture
                            }
                        }
                            .getOrNull()
                    }
            if (bytes == null || bytes.size > 12 * 1024 * 1024) {
                missingCovers.put(uri, true)
                return@withContext null
            }
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            val options =
                BitmapFactory.Options().apply {
                    inSampleSize = (maxOf(bounds.outWidth, bounds.outHeight) / 512).coerceAtLeast(1)
                }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)?.also {
                coverCache.put(uri, it)
            }
        }
    }

@Composable
fun Cover(track: Track?, modifier: Modifier = Modifier, uri: String? = null) {
    val context = LocalContext.current
    val key = uri ?: track?.coverUri ?: track?.uri
    val bitmap by
        produceState<Bitmap?>(null, key) { value = key?.let { loadImage(context, it, track?.uri) } }
    Box(
        modifier
            .size(52.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
    ) {
        if (bitmap != null)
            Image(
                bitmap!!.asImageBitmap(),
                "Albumcover",
                Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        else
            Icon(
                Icons.Rounded.MusicNote,
                "Kein Cover",
                Modifier.padding(12.dp).fillMaxSize(),
                tint = MaterialTheme.colorScheme.primary,
            )
    }
}
