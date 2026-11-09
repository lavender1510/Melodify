# Prüfprotokoll v0.2.0

Stand 09.11.2026, Linux-Cloud-Umgebung. Dieses Dokument wird vor Abschluss um Windows-CI-Ergebnisse ergänzt.

## Ausgeführt

- `npm test`: 22 Vitest-Fälle und 13 Node-Fälle erfolgreich. Bestehende Suche-/Theme-/Range-Regressionen bleiben enthalten.
- `npm run build`: TypeScript und produktiver Vite-Build erfolgreich.
- Originaler Electron-Audio-Smoke: echte WAV-Wiedergabe mit positiver Dauer, readyState 4 und fortschreitender Position erfolgreich.
- Electron 45.2.3 / Chromium 156.0.8078.80 auf Linux: synthetische 440-Hz-Fixtures für MP3, FLAC, PCM-WAV, OGG/Vorbis, Opus, AAC/ADTS und AAC/M4A jeweils geladen, gespielt, pausiert, gesucht und fortgesetzt. In allen sieben Fällen Signal im Web-Audio-Analyser. Beschädigte und fehlende MP3-Fixtures: erwarteter MediaError 4 statt erfolgreicher Wiedergabe. Dies gilt für diese Fixtures und diesen Build, nicht pauschal für alle Dateien oder Windows.
- Desktop-Smoke unter Xvfb: Preload bei aktivierter BrowserWindow-Sandbox, kein Renderer-Node, Playlist erstellen/umbenennen, ungültigen IPC-Patch abweisen, sauber schließen und Sitzung nach zwei Neustarts pausiert erhalten.
- Such-/Sortiermessung mit 1.000 / 10.000 / 50.000 synthetischen Metadaten: ungefähr 12 / 23 / 113 ms in einem Lauf. Heap des jeweiligen Testworkers ungefähr 13 / 20 / 51 MiB. Keine Aussage über gesamten App-Speicher, reale Scanrate oder Windows-Leistung.
- `npm audit --omit=dev --audit-level=high`: 0 gemeldete Schwachstellen zum Prüfzeitpunkt.

## Gezielte Regressionsfälle

100 parallele Speicher-Snapshots; JSON-Fehler; fehlendes/ungültiges Backup; Originalerhalt bei Recovery; ungültige/future Schemawerte; Schreibfehler und anschließende Erholung; fehlende/erneut gefundene Tracks; Teilscans und Lesefehler; Symlinkschleifen; Scanabbruch; verspätete Diagnose; 100 schnelle Songaufträge; Ladezeitlimit; Decoder-/Play-Fehler; pausierter Restore; Shuffle ohne Wiederholung, Zurück/Vorwärts und entfernte Queue-IDs; Playlist-Reihenfolge/Duplikate; Windows-Pfade, Unicode, BOM und M3U8-Roundtrip.

## Offen / separat zu bestätigen

- Windows-CI des finalen Commits: NSIS-Build, Installation/Start/Deinstallation und portable ZIP starten. Noch kein Erfolg behauptet.
- Physische Windows-10/11-Geräte, Ausgabegerät entfernen/wechseln, Medientasten, Tray, Installer-Upgrade über vorhandene Installation und SmartScreen.
- Reale Bibliotheken mit 10.000/50.000 Audiodateien, Scanzeiten, Wiedergabe während langer Scans, Covercache-Speicherverbrauch; große UI-Smoketests werden ergänzend durchgeführt.
- NTFS-/Stromausfall-/voller-Datenträger-Dauertest. Atomarer Rename plus fsync ist kein Ersatz für ein externes Backup.
- Kein Installer-/Release-Upload außerhalb von CI-Artefakten. Kein Release erstellt.

## Nächste Version

P2: erweiterte Filter und Metadateneditor mit ausdrücklichem Originaldatei-Schreibmodus und Backup; eigenständiger Mini-Player; Multiauswahl/Spalten und weitere Tastatur-/Accessibility-Arbeit. P3: lokale Lyrics/LRC, klar definierte Hörstatistiken, zusätzliche Smart-Regeln, ReplayGain. Crossfade/Gapless erst mit belastbaren Integrationsprüfungen.
