package dev.lyvt.melodify

import android.content.*
import android.Manifest
import android.os.Build
import androidx.test.rule.GrantPermissionRule
import android.provider.MediaStore
import androidx.media3.common.Player
import androidx.media3.session.*
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import dev.lyvt.melodify.data.*
import dev.lyvt.melodify.playback.*
import kotlinx.coroutines.runBlocking
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
@androidx.annotation.OptIn(markerClass=[androidx.media3.common.util.UnstableApi::class])
class PlaybackIntegrationTest {
    @get:Rule val permission: GrantPermissionRule = GrantPermissionRule.grant(if(Build.VERSION.SDK_INT>=33)Manifest.permission.READ_MEDIA_AUDIO else Manifest.permission.READ_EXTERNAL_STORAGE)
    private fun wav(): ByteArray {
        val count=44100*4;val b=ByteBuffer.allocate(44+count*2).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()).putInt(36+count*2).put("WAVEfmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(44100).putInt(88200).putShort(2).putShort(16).put("data".toByteArray()).putInt(count*2)
        repeat(count) { b.putShort((kotlin.math.sin(it*2*Math.PI*440/44100)*8000).toInt().toShort()) };return b.array()
    }
    @Test fun realServicePlaysInBackgroundHandlesQueueAndPersistsPausedSession() {
        val context=ApplicationProvider.getApplicationContext<MelodifyApplication>();val resolver=context.contentResolver
        val values=ContentValues().apply { put(MediaStore.Audio.Media.DISPLAY_NAME,"Melodify-instrumentation.wav");put(MediaStore.Audio.Media.MIME_TYPE,"audio/wav");put(MediaStore.Audio.Media.RELATIVE_PATH,"Music/MelodifyTests");put(MediaStore.Audio.Media.IS_PENDING,1);put(MediaStore.Audio.Media.IS_MUSIC,1) }
        val uri=resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,values)!!
        var controller: MediaController?=null
        try {
            resolver.openOutputStream(uri)!!.use { it.write(wav()) };resolver.update(uri,ContentValues().apply { put(MediaStore.Audio.Media.IS_PENDING,0) },null,null)
            InstrumentationRegistry.getInstrumentation().runOnMainSync { context.library.scan() }
            val deadline=System.currentTimeMillis()+20000
            while(context.library.status.value.running && System.currentTimeMillis()<deadline)Thread.sleep(100)
            assertNull(context.library.status.value.error)
            assertNotNull(runBlocking { context.database.music().allTracks().find { it.uri==uri.toString() } })
            val track=Track(idFor(uri.toString()),uri.toString(),"instrumentation","Testton",duration=4000)
            runBlocking { context.database.music().upsertTracks(listOf(track)) }
            val future=MediaController.Builder(context,SessionToken(context,ComponentName(context,PlaybackService::class.java))).buildAsync()
            controller=future.get(15,TimeUnit.SECONDS);val p=controller
            // A visible Activity starts playback under Android's foreground/audio-focus rules.
            val scenario=androidx.test.core.app.ActivityScenario.launch(MainActivity::class.java)
            InstrumentationRegistry.getInstrumentation().runOnMainSync { p.setMediaItems(listOf(track.mediaItem(),track.mediaItem()));p.prepare();p.play() }
            await { p.isPlaying && p.currentPosition>100 }
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
            val before=read { p.currentPosition };Thread.sleep(500);assertTrue(read { p.currentPosition }>before)
            InstrumentationRegistry.getInstrumentation().runOnMainSync { p.pause();p.seekTo(1000);p.shuffleModeEnabled=true;p.repeatMode=Player.REPEAT_MODE_ALL;p.moveMediaItem(0,1) }
            Thread.sleep(500)
            val saved=runBlocking { context.preferences.session() }!!
            assertEquals(2,saved.ids.size);assertTrue(saved.shuffle);assertEquals(Player.REPEAT_MODE_ALL,saved.repeat)
            assertFalse(read { p.isPlaying });scenario.close()
        } finally {
            controller?.let { p->InstrumentationRegistry.getInstrumentation().runOnMainSync { p.pause();p.clearMediaItems();p.release() } }
            resolver.delete(uri,null,null) // Only the fixture created above, never a user-selected file.
        }
    }
    private fun <T> read(block: ()->T): T { var result: T?=null;InstrumentationRegistry.getInstrumentation().runOnMainSync { result=block() };return result!! }
    private fun await(block: ()->Boolean) { val deadline=System.currentTimeMillis()+15000;while(System.currentTimeMillis()<deadline) { if(read(block))return;Thread.sleep(100) };fail("Playback did not advance; inspect Media3 error logs") }
}
