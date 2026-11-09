package dev.lyvt.melodify

import android.app.Application
import androidx.room.Room
import dev.lyvt.melodify.data.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow

class MelodifyApplication: Application() {
    val appScope=CoroutineScope(SupervisorJob()+Dispatchers.Main.immediate)
    val database by lazy { Room.databaseBuilder(this, MusicDatabase::class.java, "melodify.db").build() }
    val preferences by lazy { Preferences(this) }
    val library by lazy { LibraryRepository(this, database, appScope) }
    val sleepTimer=MutableStateFlow(0L)
    val playbackError=MutableStateFlow<String?>(null)
}
