package dev.lyvt.melodify.playback

import android.media.audiofx.Equalizer
import androidx.media3.common.C
import dev.lyvt.melodify.MelodifyApplication
import dev.lyvt.melodify.data.UserSettings

/** Android equalizer band counts differ by device. Never advertise ten fixed hardware bands. */
object AudioEffects {
    private var eq: Equalizer?=null
    private var session=0
    val presets=listOf("Neutral","Bass","Stimme","Rock")
    fun apply(id: Int, settings: UserSettings, app: MelodifyApplication) {
        if(id==0 || id==C.AUDIO_SESSION_ID_UNSET)return
        try {
            if(session!=id) { release();eq=Equalizer(0,id);session=id }
            val effect=eq?:return
            val range=effect.bandLevelRange
            val custom=settings.eqBands.split(',').mapNotNull { it.toIntOrNull() }
            for(i in 0 until effect.numberOfBands.toInt()) {
                val hz=effect.getCenterFreq(i.toShort())/1000
                val db=if(settings.eqPreset=="Eigene")custom.getOrElse(i) { 0 } else when(settings.eqPreset) { "Bass"->if(hz<300)5 else 0; "Stimme"->if(hz in 500..4000)3 else -1; "Rock"->if(hz<300||hz>4000)3 else -1;else->0 }
                effect.setBandLevel(i.toShort(),(db.coerceIn(-12,12)*100).coerceIn(range[0].toInt(),range[1].toInt()).toShort())
            }
            effect.enabled=true
        } catch(_: RuntimeException) { release();app.playbackError.value="Der Geräte-Equalizer ist nicht verfügbar. Wiedergabe ohne Audioeffekt." }
    }
    fun bands(): List<Int> = try { eq?.let { e -> (0 until e.numberOfBands.toInt()).map { e.getCenterFreq(it.toShort())/1000 } }?:emptyList() } catch(_: RuntimeException) { emptyList() }
    fun release() { try { eq?.release() } catch(_: RuntimeException) { };eq=null;session=0 }
}
