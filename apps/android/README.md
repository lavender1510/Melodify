# Melodify Android v0.1.0 — Preview

Native lokale Musik-App für Android 10+ (API 29). Kotlin, Jetpack Compose, Media3/ExoPlayer und MediaSessionService, Room, DataStore und Coroutines/Flow. Keine WebView und keine Internet-Berechtigung. Die Windows-App und ihre Versionsnummer bleiben unverändert.

## Funktionsumfang

- MediaStore auf internen und eingebundenen externen Volumes; zusätzliche SAF-Ordner mit dauerhafter Lesefreigabe. Aktualisieren/Abbrechen, Quellen entfernen ohne Musikdateilöschung, fehlende Metadaten und Verknüpfungen behalten. Optionaler MediaStore-Observer; SAF-Ordner werden manuell aktualisiert.
- Play/Pause, Seek, Vor/Zurück, Shuffle/Repeat, echte Media3-Queue mit Drag-and-drop und Menüalternative. Mini-Player und großer Now-Playing-Bereich.
- Hintergrund-Service, MediaSession, Medienbenachrichtigung und Systemsteuerungen; Audio Focus und „audio becoming noisy“ über Media3. Gespeicherte Sitzung wird pausiert wiederhergestellt.
- Akzentunabhängige mehrteilige Suche im Hintergrund; Sortierung; native LazyColumn-Listen, Alben/Künstler/Favoriten.
- Playlists erstellen/umbenennen/löschen, Einträge hinzufügen/entfernen/umordnen, duplizieren, Cover und Favoriten. UTF-8-M3U/M3U8 über Android-Dateidialoge. Nicht zuordenbare Einträge werden gezählt; mehrdeutige Dateinamen werden nicht geraten.
- Lokale intelligente Ansichten: zuletzt hinzugefügt, meistgehört, zuletzt abgespielt, nie gehört. Grundlegende kumulative Hörstatistik.
- Original-Branding, Adaptive Icon, 8 Melodify- und 114 Spicetify-Paletten; Vorschau, eigene Farben, Hintergrundbild, System-/Hell-/Dunkel-Modus und Tablet-Navigation.
- Geräteabhängiger Android-Equalizer mit Presets und eigenen Bandwerten. Sleep-Timer mit Presets/eigener Dauer/nach aktuellem Song. Lokale LRC-/Textdateien, synchronisierte Zeilen und umschaltbares automatisches Scrollen.

Codec-Unterstützung hängt vom Gerät und dessen MediaCodec-Decodern ab. Endungen MP3, FLAC, WAV, OGG, Opus, AAC und M4A sind Scan-Kandidaten, keine Garantie. Fehler erscheinen verständlich und erlauben die Wahl eines anderen Titels. ReplayGain, Balance, Crossfade und Visualizer werden ohne getestete native Implementierung nicht angeboten.

## Projektstruktur

`app/src/main/java/dev/lyvt/melodify/data`: Room-Datenmodell, Bibliothek, Einstellungen, Playlist-/LRC-Regeln. `playback`: einziger Player im MediaSessionService, Effekte und Sitzungs-Checkpoints. `ui`: ViewModel, Compose-Navigation, Themes und begrenzter Covercache. `app/src/test`: JVM-Regeltests. `app/src/androidTest`: Room-, Compose- und echte Service-Integration. Room-Schemata unter `app/schemas` sind versioniert; keine destructive migration.

Detaillierte Analyse/Portierungsentscheidungen: [PORTING-PLAN.md](docs/PORTING-PLAN.md). Austauschformat: [TRANSFER-FORMAT.md](docs/TRANSFER-FORMAT.md). Teststatus: [VALIDATION.md](docs/VALIDATION.md).

## Bauen

JDK 21, Android SDK Platform 37.0 und Build Tools 36.0.0. Gradle 9.6.0 Wrapper ist enthalten. Verwendete stabile Versionen wurden am 09.11.2026 in Google Maven/Maven Central geprüft und im Gradle-Projekt festgeschrieben: AGP 9.5.1, Kotlin 2.4.21, Compose BOM 2026.09.00, Media3 1.11.1, Room 2.8.5, DataStore 1.3.0.

```sh
cd apps/android
# Android Studio kann local.properties automatisch anlegen.
# Alternativ ANDROID_HOME auf das lokale SDK setzen.
./gradlew testDebugUnitTest lintDebug assembleDebug assembleRelease bundleRelease
./gradlew connectedDebugAndroidTest   # laufender Emulator oder Testgerät erforderlich
```

Windows: `gradlew.bat`. Android benötigt keinen npm-/Electron-Build. Umgekehrt benötigt Windows kein Android SDK.

Debug-APK: `app/build/outputs/apk/debug/app-debug.apk` — mit automatisch erzeugtem **Test-Schlüssel** signiert, installierbar via `adb install -r`. Unsigned Release-APK: `app/build/outputs/apk/release/app-release-unsigned.apk`. Unsigned AAB: `app/build/outputs/bundle/release/app-release.aab`. Beide Release-Artefakte sind **nicht für Endnutzer-Verteilung oder Play-Upload signiert**. Es sind keine privaten Produktionsschlüssel/Passwörter im Repository. Unterschiedliche Debug-Schlüssel können ein Update über einen älteren Testbuild verhindern; Testinstallationen nicht als ungesicherte dauerhafte Datenablage verwenden.

Der separate Android-Actions-Workflow baut/testet und liefert Artefakte. Nach grünem internem Preview-PR-Test oder ausdrücklichem manuellen Auftrag bereitet er einen unveröffentlichten Release-Entwurf vor. Er veröffentlicht keinen Release. Die spätere Produktionssignierung benötigt einen sicher bereitgestellten Schlüssel und eine bewusste Freigabe.

## Berechtigungen und Daten

Android 13+: READ_MEDIA_AUDIO, Android 10–12: READ_EXTERNAL_STORAGE, nur für die MediaStore-Bibliothek. SAF-Dateidialoge funktionieren unabhängig davon mit expliziter Ordnerfreigabe. FOREGROUND_SERVICE und FOREGROUND_SERVICE_MEDIA_PLAYBACK sind für Wiedergabe nötig; WAKE_LOCK schützt laufende Wiedergabe bei abgeschaltetem Display. Medienbenachrichtigungen einer MediaSession sind von der allgemeinen Android-13-Benachrichtigungsberechtigung ausgenommen. Kein MANAGE_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, RECORD_AUDIO, INTERNET oder Tracking.

Musikdateien werden nicht verändert oder gelöscht. Lokale Daten liegen im privaten App-Verzeichnis: Room mit WAL/Transaktionen, DataStore mit atomaren Updates und importierte Lyrics. Die App verwendet keine Cloud-Backups. Entfernte Quellen behalten URI-Grants für erhaltene Tracks/Playlist-Verknüpfungen. Nach Android-Deinstallation gehen private App-Daten verloren; Originalmusik bleibt erhalten.

## Bekannte Grenzen und nächste Schritte

- Tages-/Monats-/Jahresstatistik und Widgets folgen; vorhanden ist eine klar beschriftete kumulative Statistik.
- Eingebettete Lyrics werden noch nicht extrahiert; lokale LRC/Text-Importe funktionieren. Keine Online-Lyrics.
- M3U-Export nutzt gerätegebundene Content-URIs. Windows-Pfade werden nur über eindeutige bekannte Dateinamen zugeordnet. Das dokumentierte JSON-Austauschformat ist vorbereitet, sein plattformübergreifender Import/Export ist noch nicht freigeschaltet.
- SAF-/SD-Provider können blockieren; Coroutines können eine bereits laufende Binder-/Metadatenoperation nicht hart abbrechen. Eine unvollständige Quelle wird nicht als vollständig fehlend übernommen.
- URI-Identität verhindert doppelte Einträge derselben URI. MediaStore- und SAF-URIs derselben Datei können unterschiedliche Identitäten besitzen; keine destruktive automatische Zusammenführung.
- Equalizer-Unterstützung, Headsets/Bluetooth, Audio Focus, Sperrbildschirm und OEM-Akkuoptimierung müssen zusätzlich auf realen Geräten geprüft werden. Keine pauschale lückenlose Wiedergabegarantie.
- Hörzeit zählt tatsächliche Playing-Zeit in Sekunden. Ein Play zählt nach 30 Sekunden oder der Hälfte eines kurzen Titels. Checkpoints alle fünf Sekunden und bei Playerzustandswechseln; nach hartem Prozessabbruch kann der letzte ungespeicherte Rest fehlen.

## Design aktualisieren

`node apps/android/scripts/sync-design.cjs` aus dem Repository-Hauptverzeichnis (mit installierten Windows-Entwicklungsabhängigkeiten) erzeugt `themes.json` erneut aus den bestehenden TypeScript-Paletten. Das Android-Bauen benötigt diese Entwicklungsabhängigkeiten nicht. Herkunft/Lizenzen: [THIRD_PARTY_THEMES.md](../../THIRD_PARTY_THEMES.md), Kopie und MIT-Lizenz sind auch im APK enthalten.
