# Prüfprotokoll v0.2.0

Stand 09.11.2026, Linux-Cloud-Umgebung. Windows-CI wird pro Commit ausgewiesen; spätere Commits benötigen einen erneuten grünen Lauf.

## Ausgeführt

- `npm test`: 23 Vitest-Fälle und 18 Node-Fälle erfolgreich. Bestehende Suche-/Theme-/Range-Regressionen bleiben enthalten.
- `npm run build`: TypeScript und produktiver Vite-Build erfolgreich.
- Originaler Electron-Audio-Smoke: echte WAV-Wiedergabe mit positiver Dauer, readyState 4 und fortschreitender Position erfolgreich.
- Electron 45.2.3 / Chromium 156.0.8078.80 auf Linux: synthetische 440-Hz-Fixtures für MP3, FLAC, PCM-WAV, OGG/Vorbis, Opus, AAC/ADTS und AAC/M4A jeweils geladen, gespielt, pausiert, gesucht und fortgesetzt. In allen sieben Fällen Signal im Web-Audio-Analyser. Beschädigte und fehlende MP3-Fixtures: erwarteter MediaError 4 statt erfolgreicher Wiedergabe. Dies gilt für diese Fixtures und diesen Build, nicht pauschal für alle Dateien oder Windows.
- Desktop-Smoke unter Xvfb (einschließlich korrupter Primärdatei beim Start und im laufenden Betrieb, Backup-Recovery und anschließendem Sitzungscheckpoint): Preload bei aktivierter BrowserWindow-Sandbox, kein Renderer-Node, Playlist erstellen/umbenennen, ungültigen IPC-Patch abweisen, sauber schließen und Sitzung nach zwei Neustarts pausiert erhalten.
- Such-/Sortiermessung mit 1.000 / 10.000 / 50.000 synthetischen Metadaten: ungefähr 12 / 23 / 113 ms in einem Lauf. Heap des jeweiligen Testworkers ungefähr 13 / 20 / 51 MiB. Keine Aussage über gesamten App-Speicher, reale Scanrate oder Windows-Leistung.
- `npm audit --omit=dev --audit-level=high`: 0 gemeldete Schwachstellen zum Prüfzeitpunkt.

## Gezielte Regressionsfälle

100 parallele Speicher-Snapshots; JSON-Fehler; fehlendes/ungültiges Backup; Originalerhalt bei Recovery; ungültige/future Schemawerte; Schreibfehler und anschließende Erholung; fehlende/erneut gefundene Tracks; Teilscans und Lesefehler; Symlinkschleifen; Scanabbruch; Überwachung während Wiedergabe; Ordnerentfernung ohne Dateilöschung; fehlender Primärbestand mit erhaltenem Backup/Temp; verspätete Diagnose; 100 schnelle Songaufträge; Ladezeitlimit; Decoder-/Play-Fehler; pausierter Restore; Shuffle ohne Wiederholung, Zurück/Vorwärts und entfernte Queue-IDs; Playlist-Reihenfolge/Duplikate; Windows-Pfade, Unicode, BOM und M3U8-Roundtrip.

## Offen / separat zu bestätigen

- Erster Windows-CI-Lauf [42593138225](https://github.com/lavender1510/Melodify/actions/runs/42593138225) für Commit `1cbaac3`: erfolgreich. Tests/Build, Codec-Smoke, ursprünglicher WAV-Smoke, Desktop-Smoke, NSIS-/Portable-Paketbau, stille NSIS-Installation, Start der installierten App, stille Deinstallation und Start aus entpackter portabler ZIP waren grün. Nachfolgende Ergänzungen erhalten einen eigenen Lauf; Endstand siehe PR-Checks.
- Physische Windows-10/11-Geräte, Ausgabegerät entfernen/wechseln, Medientasten, Tray, Installer-Upgrade über vorhandene Installation und SmartScreen.
- Reale Bibliotheken mit 10.000/50.000 Audiodateien, Scanzeiten, Wiedergabe während langer Scans und Covercache-Speicherverbrauch bleiben offen. Synthetischer Desktop-Katalogtest siehe unten.
- NTFS-/Stromausfall-/voller-Datenträger-Dauertest. Atomarer Rename plus fsync ist kein Ersatz für ein externes Backup.
- Kein Installer-/Release-Upload außerhalb von CI-Artefakten. Kein Release erstellt.

## Nächste Version

P2: erweiterte Filter und Metadateneditor mit ausdrücklichem Originaldatei-Schreibmodus und Backup; eigenständiger Mini-Player; Multiauswahl/Spalten und weitere Tastatur-/Accessibility-Arbeit. P3: lokale Lyrics/LRC, klar definierte Hörstatistiken, zusätzliche Smart-Regeln, ReplayGain. Crossfade/Gapless erst mit belastbaren Integrationsprüfungen.

## Desktop-Kataloglast unter Linux / Xvfb

`DISPLAY=:99 node scripts/library-performance.cjs` lädt echte Electron-Fenster mit synthetischen Katalogen, sucht über die UI und scrollt bis zum letzten Treffer. Alle drei Durchläufe erfolgreich. Startup enthält den gewollten Splash. Eine Messung, keine garantierten Zielwerte.

| Katalogeinträge | Start inkl. Splash | Suche inkl. UI | Gemountete Zeilen | Renderer-Arbeitsspeicher |
| ---: | ---: | ---: | ---: | ---: |
| 1.000 | 2.200 ms | 74 ms | 27 | 174 MiB |
| 10.000 | 2.141 ms | 92 ms | 27 | 242 MiB |
| 50.000 | 2.287 ms | 221 ms | 27 | 316 MiB |

Weitere Electron-Prozesse benötigen zusätzlichen Speicher. Diese Werte messen keine Scanrate und keine echten Musik-/Coverdateien. Die Maschine hat keine physische Audiohardware; Web-Audio-Signal und Medienzeit wurden geprüft, hörbare Ausgabe und Hotplug nicht.
