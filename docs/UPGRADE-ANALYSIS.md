# v0.2.0: Bestandsaufnahme und Plan

Basis: main cdbb4c9 (v0.1.6), untersucht am 09.11.2026. Keine AGENTS.md vorhanden.

## Vorhanden
Electron Main/Preload mit kleiner Bridge; React 19/TypeScript/Vite; HTMLAudioElement über eigenen Byte-Range-Mediendienst, Web Audio mit 10 EQ-Bändern, Balance, Gain, Kompressor, Analyser und Geräteauswahl. Ordnerscan mit music-metadata und Covercache; globale mehrteilige akzentunabhängige Suche; Sortierungen; Favoriten; M3U-Import; Queue-DnD; acht eigene und 114 Spicetify-Paletten sowie eigene Themes. Tray und Media Session. Vitest-Suche/Theme-, Node-Range- und Electron-WAV-Smoke-Tests. Windows CI erstellt NSIS und portable ZIP.

## Bestätigte Codebefunde der Basis
- `electron/main.cjs:17` saveState: alle Aufrufe schreiben library.json.tmp ohne Serialisierung; parallele Aufrufe können Dateiinhalt/Rename gegenseitig beeinflussen. Risikomechanismus im Code belegt; realer Nutzerdatenverlust nicht reproduziert.
- `electron/main.cjs:23` restore: jeder Lesefehler/JSON-Fehler führt still zu defaults; nächstes Speichern überschreibt den Bestand. Keine Backups/Migrationen, Arrays werden abgeschnitten statt validiert.
- `electron/main.cjs:67-69` scan: state.tracks wird nur aus gefundenen Dateien ersetzt; fehlende Titel und Verweise verlieren ihre Metadaten. readdir-Fehler werden verschluckt.
- `src/App.tsx:179-219` startTrack: nach diagnoseMedia/prepareAudio gibt es keine Prüfung, ob der Auftrag noch aktuell ist. loadedmetadata-Promise besitzt keinen Timeout und keine Abbruchmöglichkeit.
- `src/App.tsx:224` Shuffle wählt zufällig jeden nächsten Titel; Wiederholungen vor Ende eines Durchlaufs sind möglich, Zurück nutzt keine Wiedergabehistorie.
- `src/App.tsx:250` sortTracks wird auch auf geordnete Playlist angewendet; manuelle Reihenfolge wird in der Ansicht überschrieben.
- `src/App.tsx:224-228` wiederholtes play() teilweise ohne Rejection-Behandlung; kein Sitzungsrestore.
- `src/App.tsx:229` Playlist-Umbenennung verwendet window.prompt; Chromium/Electron unterstützt diesen Dialog nicht zuverlässig (Umgebungsrisiko, hier noch nicht reproduziert).
- `electron/main.cjs:118` Renderer sandbox:false trotz kompatibler kleiner Preload-API. Navigation nutzt startsWith statt exakter Zielprüfung; IPC-Patches validieren Einstellungswerte nicht.
- `.github/workflows/windows-release.yml`: main-Push veröffentlicht automatisch Release; Setup-Prüfung prüft nur Dateigröße, führt keine Installation/Deinstallation aus.
- App-Komponente bündelt Audio, State, Auswahl und Darstellung; wiederholte Includes/Sortierung und vollständiges Rendering aller Zeilen. Auswirkungen bei 50.000 Titeln sind zunächst Performance-Vermutung, keine gemessene Regression.

## Priorisierte Umsetzung
1. P0: serialisierte atomare Snapshots, validierte Legacy-Migration, lokale Backups, Sperre bei beschädigtem Bestand und explizite Wiederherstellung; Shutdown-Flush; sichere IPC/Navigation/Sandbox; Release-Automatik aus.
2. P0: Audio-Auftragskontrolle mit Abort/Timeout, Fehler-Recovery und kontrolliertem Resume; bestehende Audio-Kette erhalten.
3. P1: Ordner einzeln scannen/entfernen, Scan abbrechen, Status/Fehler, fehlende Tracks erhalten; Sitzung pausiert wiederherstellen; Shuffle-Durchlauf und Historie; Queue leeren.
4. P1: Playlist-Reihenfolge/DnD, Duplikat, Cover, M3U8-Export; eigene Dialoge; lokale regelbasierte Sammlungen.
5. Tests: Baseline, gezielte Regressionsfälle, TypeScript/Build, echte Electron-Smokes, synthetische Suchmessungen; Windows CI bauen und Windows-Installationsprüfung separat dokumentieren.

P2/P3 folgen getrennt: erweiterter Metadaten-/Originaldatei-Editor, indizierte Filter/Virtualisierung, Mini-Fenster, Lyrics, Hörstatistik, ReplayGain. Crossfade/Gapless bleiben bis zu belastbaren Audio-Integrationstests deaktiviert. Optionale Ordnerüberwachung wird auf dem stabilisierten Scanpfad ergänzt.

## Freigabekriterien
Kein Release, keine Behauptung ungeprüfter Codec-Unterstützung. Linux-Tests ersetzen keine Windows-Geräte-/NSIS-/Portable-Prüfung. V0.2.0 bleibt Reviewstand, solange diese Prüfungen ausstehen.
