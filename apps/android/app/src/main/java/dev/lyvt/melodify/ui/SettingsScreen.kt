package dev.lyvt.melodify.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.lyvt.melodify.data.UserSettings
import dev.lyvt.melodify.playback.AudioEffects
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

@Composable
fun SettingsScreen(
    settings: UserSettings,
    themes: List<Palette>,
    vm: MusicViewModel,
    chooseBackground: () -> Unit,
) {
    val sleep by vm.app.sleepTimer.collectAsStateWithLifecycle()
    var customMinutes by remember { mutableStateOf("") }
    var themeDialog by remember { mutableStateOf(false) }
    var customDialog by remember { mutableStateOf(false) }
    var customName by remember { mutableStateOf("") }
    var customBg by remember { mutableStateOf("#10131b") }
    var customSurface by remember { mutableStateOf("#1b2130") }
    var customText by remember { mutableStateOf("#f5f3fc") }
    var customAccent by remember { mutableStateOf("#b99bff") }
    var preview by remember { mutableStateOf<Palette?>(null) }
    LazyColumn(
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Text("Dein Sound. Deine Regeln.", style = MaterialTheme.typography.headlineMedium) }
        item {
            Text("Darstellung", style = MaterialTheme.typography.titleLarge)
            Text(themes.firstOrNull { it.id == settings.themeId }?.name ?: "Nocturne")
            Button(onClick = { themeDialog = true }) { Text("${themes.size} Themes entdecken") }
        }
        item {
            FlowRow {
                listOf(
                        "theme" to "Theme",
                        "system" to "System",
                        "dark" to "Dunkel",
                        "light" to "Hell",
                    )
                    .forEach { (value, label) ->
                        FilterChip(
                            selected = settings.mode == value,
                            onClick = { vm.updateSettings(settings.copy(mode = value)) },
                            label = { Text(label) },
                        )
                    }
            }
        }
        item {
            OutlinedButton(onClick = { customDialog = true }) {
                Text("Eigene Farbpalette erstellen")
            }
            OutlinedButton(onClick = chooseBackground) { Text("Eigenes Hintergrundbild") }
            if (settings.background.isNotEmpty())
                TextButton(onClick = { vm.updateSettings(settings.copy(background = "")) }) {
                    Text("Hintergrundbild entfernen")
                }
        }
        item {
            HorizontalDivider()
            Text("Bibliothek", style = MaterialTheme.typography.titleLarge)
            ListItem(
                headlineContent = { Text("Medienspeicher beobachten") },
                supportingContent = {
                    Text(
                        "Aktualisiert MediaStore nach Änderungen. SAF-Ordner bitte manuell neu scannen."
                    )
                },
                trailingContent = {
                    Switch(settings.autoScan, { vm.updateSettings(settings.copy(autoScan = it)) })
                },
            )
        }
        item {
            HorizontalDivider()
            Text("Equalizer", style = MaterialTheme.typography.titleLarge)
            Text(
                "Android stellt Frequenzbänder und Effekte geräteabhängig bereit. Lautstärke wird über die Systemtasten gesteuert."
            )
            FlowRow {
                AudioEffects.presets.forEach { preset ->
                    FilterChip(
                        selected = settings.eqPreset == preset,
                        onClick = { vm.updateSettings(settings.copy(eqPreset = preset)) },
                        label = { Text(preset) },
                    )
                }
            }
        }
        val bands = AudioEffects.bands()
        if (bands.isEmpty())
            item {
                Text(
                    "Starte einen Titel, um den Geräte-Equalizer zu prüfen. Ohne unterstützten Effekt wird unverändert abgespielt.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        else
            items(bands.indices.toList()) { i ->
                val values =
                    bands
                        .mapIndexed { index, hz ->
                            if (settings.eqPreset == "Eigene")
                                settings.eqBands
                                    .split(',')
                                    .mapNotNull { it.toIntOrNull() }
                                    .getOrElse(index) { 0 }
                            else
                                when (settings.eqPreset) {
                                    "Bass" -> if (hz < 300) 5 else 0
                                    "Stimme" -> if (hz in 500..4000) 3 else -1
                                    "Rock" -> if (hz < 300 || hz > 4000) 3 else -1
                                    else -> 0
                                }
                        }
                        .toMutableList()
                Text("${bands[i]} Hz · ${values[i]} dB")
                Slider(
                    values[i].toFloat(),
                    onValueChange = { value ->
                        values[i] = value.toInt()
                        vm.updateSettings(
                            settings.copy(eqPreset = "Eigene", eqBands = values.joinToString(","))
                        )
                    },
                    valueRange = -12f..12f,
                    steps = 23,
                )
            }
        item {
            HorizontalDivider()
            Text("Sleep-Timer", style = MaterialTheme.typography.titleLarge)
            Text("Beendet die Wiedergabe, ohne Musikdateien zu verändern.")
            Row {
                listOf(15, 30, 45, 60).forEach { minutes ->
                    TextButton(
                        onClick = {
                            vm.app.sleepTimer.value = System.currentTimeMillis() + minutes * 60_000L
                        }
                    ) {
                        Text("${minutes} Min.")
                    }
                }
            }
            TextButton(onClick = { vm.app.sleepTimer.value = -1 }) {
                Text("Nach dem aktuellen Song")
            }
            TextButton(onClick = { vm.app.sleepTimer.value = 0 }) { Text("Timer ausschalten") }
            OutlinedTextField(
                customMinutes,
                { customMinutes = it.filter(Char::isDigit).take(4) },
                label = { Text("Eigene Dauer in Minuten") },
            )
            TextButton(
                enabled = (customMinutes.toLongOrNull() ?: 0) in 1..1440,
                onClick = {
                    vm.app.sleepTimer.value =
                        System.currentTimeMillis() + customMinutes.toLong() * 60_000
                },
            ) {
                Text("Eigene Dauer starten")
            }
            Text(
                if (sleep == -1L) "Aktiv: nach aktuellem Song"
                else if (sleep > 0)
                    "Aktiv bis " +
                        java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT)
                            .format(java.util.Date(sleep))
                else "Kein Timer aktiv"
            )
        }
        item {
            HorizontalDivider()
            Text("Melodify Android · 0.1.0 Preview", style = MaterialTheme.typography.titleMedium)
            Text(
                "Native, lokale Musikwiedergabe. Kein Konto, keine Werbung, keine Telemetrie, keine Internet-Berechtigung. Wiedergabeformate hängen von den Decodern deines Geräts ab. Dynamikkompression ist kein ReplayGain; Crossfade, Visualizer und Balance werden in dieser Version nicht angeboten."
            )
            Text(
                "Play-Zählung: mindestens 30 Sekunden oder die Hälfte eines kurzen Titels tatsächlich gehört. Hörzeit wird lokal in Room gespeichert."
            )
            Text(
                "Spicetify-Farbpaletten: Copyright 2019 morpheusthewhite und jeweilige Theme-Beitragende, MIT. Vollständige Hinweise liegen als THIRD_PARTY_THEMES.md im App-Asset-Verzeichnis.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
    if (themeDialog)
        AlertDialog(
            onDismissRequest = { themeDialog = false },
            title = { Text("Dein Melodify-Look") },
            text = {
                LazyColumn(Modifier.heightIn(max = 450.dp)) {
                    items(themes, key = { it.id }) { t ->
                        Row(Modifier.fillMaxWidth().clickable { preview = t }.padding(8.dp)) {
                            Box(Modifier.size(36.dp).background(color(t.background))) {
                                Box(Modifier.padding(8.dp).size(20.dp).background(color(t.accent)))
                            }
                            Text(t.name, Modifier.padding(8.dp))
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { themeDialog = false }) { Text("Schließen") } },
        )
    preview?.let { t ->
        AlertDialog(
            onDismissRequest = { preview = null },
            containerColor = color(t.background),
            titleContentColor = readable(color(t.text), color(t.background)),
            textContentColor = readable(color(t.text), color(t.background)),
            title = { Text(t.name) },
            text = {
                Column {
                    Text("Deine Musik. Dein Moment.")
                    Surface(color = color(t.surface)) {
                        Text(
                            "Songliste und Player",
                            Modifier.padding(16.dp),
                            color = readable(color(t.text), color(t.surface)),
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        vm.updateSettings(settings.copy(themeId = t.id, mode = "theme"))
                        preview = null
                        themeDialog = false
                    }
                ) {
                    Text("Anwenden", color = readable(color(t.accent), color(t.background)))
                }
            },
            dismissButton = {
                TextButton(onClick = { preview = null }) {
                    Text("Zurück", color = readable(color(t.text), color(t.background)))
                }
            },
        )
    }
    if (customDialog)
        AlertDialog(
            onDismissRequest = { customDialog = false },
            title = { Text("Eigene Farbpalette") },
            text = {
                Column(Modifier.heightIn(max = 400.dp).verticalScroll(rememberScrollState())) {
                    OutlinedTextField(
                        customName,
                        { customName = it.take(48) },
                        label = { Text("Name") },
                    )
                    listOf(
                            Triple("Hintergrund", customBg, { v: String -> customBg = v }),
                            Triple(
                                "Oberflächen",
                                customSurface,
                                { v: String -> customSurface = v },
                            ),
                            Triple("Text", customText, { v: String -> customText = v }),
                            Triple("Akzent", customAccent, { v: String -> customAccent = v }),
                        )
                        .forEach { (label, value, set) ->
                            OutlinedTextField(
                                value,
                                set,
                                label = { Text("$label · #RRGGBB") },
                                singleLine = true,
                            )
                        }
                }
            },
            confirmButton = {
                TextButton(
                    enabled =
                        customName.isNotBlank() &&
                            listOf(customBg, customSurface, customText, customAccent).all {
                                it.matches(Regex("#[0-9a-fA-F]{6}"))
                            },
                    onClick = {
                        val id = "custom-${UUID.randomUUID()}"
                        val a = JSONArray(settings.customThemes)
                        a.put(
                            JSONObject()
                                .put("id", id)
                                .put("name", customName)
                                .put("background", customBg)
                                .put("surface", customSurface)
                                .put("panel", customSurface)
                                .put("text", customText)
                                .put("muted", customText)
                                .put("accent", customAccent)
                        )
                        vm.updateSettings(
                            settings.copy(customThemes = a.toString(), themeId = id, mode = "theme")
                        )
                        customDialog = false
                    },
                ) {
                    Text("Speichern")
                }
            },
            dismissButton = {
                TextButton(onClick = { customDialog = false }) { Text("Abbrechen") }
            },
        )
}
