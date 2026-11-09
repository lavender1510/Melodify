package dev.lyvt.melodify.data

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.*
import org.json.JSONObject

val Context.preferences by preferencesDataStore("melodify_settings")

data class UserSettings(
    val themeId: String = "nocturne",
    val mode: String = "theme",
    val background: String = "",
    val autoScan: Boolean = false,
    val eqPreset: String = "Neutral",
    val eqBands: String = "",
    val customThemes: String = "[]",
)

data class PlaybackSnapshot(
    val ids: List<String>,
    val index: Int,
    val position: Long,
    val repeat: Int,
    val shuffle: Boolean,
)

class Preferences(private val context: Context) {
    private val theme = stringPreferencesKey("theme")
    private val mode = stringPreferencesKey("mode")
    private val background = stringPreferencesKey("background")
    private val autoScan = booleanPreferencesKey("autoScan")
    private val preset = stringPreferencesKey("eqPreset")
    private val bands = stringPreferencesKey("eqBands")
    private val custom = stringPreferencesKey("customThemes")
    private val session = stringPreferencesKey("session.v1")
    // Surface corruption instead of silently replacing user preferences.
    val settings =
        context.preferences.data.map {
            UserSettings(
                it[theme] ?: "nocturne",
                it[mode] ?: "theme",
                it[background] ?: "",
                it[autoScan] ?: false,
                it[preset] ?: "Neutral",
                it[bands] ?: "",
                it[custom] ?: "[]",
            )
        }

    suspend fun update(value: UserSettings) {
        context.preferences.edit {
            it[theme] = value.themeId
            it[mode] = value.mode
            it[background] = value.background
            it[autoScan] = value.autoScan
            it[preset] = value.eqPreset
            it[bands] = value.eqBands
            it[custom] = value.customThemes
        }
    }

    suspend fun saveSession(value: PlaybackSnapshot) {
        context.preferences.edit {
            it[session] =
                JSONObject()
                    .put("version", 1)
                    .put("ids", org.json.JSONArray(value.ids))
                    .put("index", value.index)
                    .put("position", value.position.coerceAtLeast(0))
                    .put("repeat", value.repeat)
                    .put("shuffle", value.shuffle)
                    .toString()
        }
    }

    suspend fun session(): PlaybackSnapshot? {
        val raw = context.preferences.data.first()[session] ?: return null
        val json = JSONObject(raw)
        require(json.getInt("version") == 1) { "Unbekannte Sitzungsversion" }
        val ids = json.getJSONArray("ids")
        val list = List(ids.length()) { ids.getString(it) }
        return PlaybackSnapshot(
            list,
            json.getInt("index").coerceIn(0, (list.size - 1).coerceAtLeast(0)),
            json.getLong("position").coerceAtLeast(0),
            json.getInt("repeat").coerceIn(0, 2),
            json.getBoolean("shuffle"),
        )
    }
}
