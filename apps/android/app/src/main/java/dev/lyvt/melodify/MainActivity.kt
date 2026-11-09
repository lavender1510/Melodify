package dev.lyvt.melodify

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.lyvt.melodify.ui.MelodifyApp

class MainActivity: ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState);enableEdgeToEdge();volumeControlStream=android.media.AudioManager.STREAM_MUSIC;setContent { MelodifyApp(viewModel()) } }
}
