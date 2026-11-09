# Android-Port: Analyse und Umsetzungsplan

Basis: main 88f1cb8, 09.11.2026. Windows bleibt v0.2.0; Android beginnt separat mit v0.1.0. Repository vollständig nach Main-/Preload-/Audio-/Bibliotheks-/Playlist-/Theme-/UI-/Test-/CI-Modulen untersucht. Keine AGENTS.md vorhanden.

## Bestehendes Verhalten und Übernahme

| Windows-Quelle | Bestand | Android-Entscheidung |
| --- | --- | --- |
| src/types.ts, electron/state-store.cjs | Tracks, Playlists, Favoriten, Settings, Session; Schema 1, JSON, Backup | Neue Room-Tabellen und DataStore; niemals Desktop-JSON als Android-Datenbank öffnen |
| electron/library.cjs, main.cjs | Ausgewählte Pfade, music-metadata, vier parallele Lesevorgänge, fehlende Tracks erhalten | MediaStore für freigegebene Volumes und SAF mit persistierter Lesefreigabe; pro vollständiger Quelle transaktionaler Merge |
| src/music.ts | Mehrteilige akzentunabhängige Suche und Sortierung | Kotlin-Regeln mit derselben Normalisierung; Hintergrund-Flow, debounce, LazyColumn |
| src/playback.ts und App.tsx | HTMLAudioElement, Web Audio, Queue, pausierter Restore | Vollständig neu: ExoPlayer in MediaSessionService, MediaController als einzige UI-Steuerung, Audio Focus/noisy handling |
| electron/playlists.cjs, src/playlists.ts | Manuelle Reihenfolge, Duplikate, Cover, Favoriten, UTF-8-M3U, lokale Smart-Regeln | Room-Entries mit stabiler Entry-ID und Position; SAF-Import/Export; Android-Content-URIs statt Windows-Pfaden |
| src/theme.ts, src/spicetifyThemes.ts | 8 eigene und 114 adaptierte Paletten; effektive Kontrastkorrektur | Generiertes assets/themes.json mit identischen IDs, Namen und effektiven Farben; Compose korrigiert Inhaltskontrast je Oberfläche |
| public/melodify-logo.png, build/icon.ico | Eigenes Branding | Original-PNG, Adaptive Icon und nativer Android-Splash |
| src/App.tsx, styles.css | Sidebar, Desktop-Tabelle, Mini-Leiste, Now Playing | Eigene Compose-Oberfläche: fünf Bottom-Ziele, Tablet-Rail, Mini-Player und großer Player; keine WebView |
| electron/preload.cjs, Main-Sicherheit | Bridge, Sandbox, registrierte Medien-IDs | Keine Electron-Bridge: Android-Berechtigungen, ContentResolver, eingeschränkte MediaSession-Controller, keine Internet-Berechtigung |
| .github/workflows/windows-release.yml | Windows-Paketbau und Smokes | Bleibt unverändert. Eigenes Android-Gradle-/CI-Projekt mit unsigned Release-Artefakten |

## Erste zusammenhängende Version

1. Eigenes Gradle-/Compose-Projekt, API 29+, stabile fest versionierte AndroidX-Pakete.
2. Room/Settings, MediaStore/SAF, fehlende Titel behalten; lesbare Fehler und Scan-Abbruch.
3. ExoPlayer/MediaSessionService mit Audio Focus, Kopfhörerentfernung, Notification/Lockscreen, echter Queue und pausiertem Restore.
4. Native Navigation, Suche/Sortierung, Playlists/Favoriten, Themenwahl/eigene Farben/Hintergrund, Geräte-Equalizer und Sleep-Timer.
5. Unit-/Room-/Compose-/Service-Smokes, Debug-APK, unsigned Release-APK und AAB; unabhängiger GitHub-PR und Build-Artefakte.

## Weitere Ausbauschritte

Lokale synchronisierte LRC-Texte, robustes plattformübergreifendes Import-/Exportformat, eigene Dauer für Sleep-Timer, Widgets, breite Smartphone-/Tablet- und Hardware-Abnahme. Visualizer benötigt gesonderte Geräte-/Berechtigungsentscheidung; kein RECORD_AUDIO nur für eine optische Simulation. Balance/Crossfade werden ohne überprüfte DSP-Implementierung nicht angeboten. ExoPlayer kann geeignete Streams nahtlos abspielen; Gapless ist keine pauschal garantierte Eigenschaft aller Dateien/Geräte.

## Sicherheits- und Datenregeln

Keine Schreib-/Löschberechtigung für Musik, kein MANAGE_EXTERNAL_STORAGE, keine Internet-Berechtigung, kein Konto/Tracking. SAF-Grants bleiben für erhaltene Playlist-Verweise bestehen, wenn eine Scanquelle entfernt wird. Externe Mediencontroller dürfen die private Wiedergabeliste nicht durch beliebige URIs ersetzen. Room besitzt keine destructive migration; neue Schemaversionen benötigen ausdrückliche Migrationen. Release-Signierung bleibt ohne sicher bereitgestellten Schlüssel deaktiviert.
