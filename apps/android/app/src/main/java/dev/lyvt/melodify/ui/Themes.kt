package dev.lyvt.melodify.ui

import android.content.Context
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import dev.lyvt.melodify.data.UserSettings
import org.json.JSONArray
import org.json.JSONObject

data class Palette(
    val id: String,
    val name: String,
    val background: String,
    val surface: String,
    val panel: String,
    val text: String,
    val muted: String,
    val accent: String,
)

fun readPalette(o: JSONObject) =
    Palette(
        o.getString("id"),
        o.getString("name"),
        o.getString("background"),
        o.getString("surface"),
        o.getString("panel"),
        o.getString("text"),
        o.getString("muted"),
        o.getString("accent"),
    )

fun palettes(context: Context, custom: String): List<Palette> {
    val defaults =
        JSONArray(context.assets.open("themes.json").bufferedReader().use { it.readText() })
    val list = (0 until defaults.length()).map { readPalette(defaults.getJSONObject(it)) }
    return list +
        runCatching {
                val a = JSONArray(custom)
                (0 until a.length()).map { readPalette(a.getJSONObject(it)) }
            }
            .getOrDefault(emptyList())
}

fun color(value: String) = runCatching {
    Color(android.graphics.Color.parseColor(value))
}
    .getOrDefault(Color(0xffb99bff))

fun contrast(a: Color, b: Color): Float =
    (maxOf(a.luminance(), b.luminance()) + .05f) / (minOf(a.luminance(), b.luminance()) + .05f)

fun readable(text: Color, bg: Color) =
    if (contrast(text, bg) >= 4.5f) text
    else if (contrast(Color.White, bg) > contrast(Color.Black, bg)) Color.White else Color.Black

@Composable
fun MelodifyTheme(
    settings: UserSettings,
    palettes: List<Palette>,
    content: @Composable () -> Unit,
) {
    val id =
        when (settings.mode) {
            "system" -> if (isSystemInDarkTheme()) "nocturne" else "cloud"
            "dark" -> "nocturne"
            "light" -> "cloud"
            else -> settings.themeId
        }
    val t = palettes.firstOrNull { it.id == id } ?: palettes.first()
    val bg = color(t.background)
    val surface = color(t.surface)
    val panel = color(t.panel)
    val accent = color(t.accent)
    val base = if (bg.luminance() < .5f) darkColorScheme() else lightColorScheme()
    MaterialTheme(
        colorScheme =
            base.copy(
                primary = accent,
                onPrimary = readable(Color.White, accent),
                primaryContainer = panel,
                onPrimaryContainer = readable(color(t.text), panel),
                secondary = accent,
                onSecondary = readable(Color.White, accent),
                background = bg,
                onBackground = readable(color(t.text), bg),
                surface = surface,
                onSurface = readable(color(t.text), surface),
                surfaceVariant = panel,
                onSurfaceVariant = readable(color(t.muted), panel),
                surfaceContainer = panel,
                surfaceContainerHigh = panel,
                surfaceContainerHighest = panel,
                surfaceContainerLow = surface,
                surfaceContainerLowest = bg,
                surfaceTint = accent,
            ),
        content = content,
    )
}
