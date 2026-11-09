# Architektur und Datenvertrag

## Main und privilegierte Dienste

- `electron/main.cjs`: App-/Fenster-Lifecycle, schmale validierte IPC-Routen, Medienregistrierung und Scan-Orchestrierung. Renderer darf keine Trackpfade über state:save hinzufügen.
- `state-store.cjs`: Schema-1-Validierung, Legacy-Ergänzung ohne Abschneiden von Arrays, unveränderliche Snapshots, eine Promise-Schreibkette, fsync der temporären Datei, atomarer Rename und validiertes Vorgängerbackup. Nach Schreibfehler bleibt die Kette benutzbar. Bei korruptem Primärbestand ist Speichern gesperrt. Recovery validiert zuerst das Backup und archiviert Originalbytes.
- `library.cjs`: Pfadgrenzen, symlinkfreier rekursiver Scan, Dateikandidaten und verlustfreie Teilscan-Zusammenführung. Ein Leseproblem beweist keine Abwesenheit. Eine fehlende Datei wird nur bei fehlerfreier Erfassung als fehlend markiert.
- `watch-folders.cjs`: opt-in fs.watch, Debounce und ein Worker; bei laufendem Scan erneuter Versuch statt parallelem Scan.
- `playlists.cjs`: lokaler M3U-Parser, Warnungszähler und geordneter UTF-8-Export; keine Online-Playlistauflösung.
- `media-server.cjs`: bestehendes bytegenaues Streaming mit Range, HEAD und kontrollierten MIME-Typen.

Es werden maximal vier Metadatenoperationen gleichzeitig gestartet. Ein Batch hat 15 Sekunden Zeit; bei Timeout/Abbruch wird der gesamte Scan ohne Katalogersatz beendet. Ein bereits im Betriebssystem laufender Datei-Lesevorgang kann dadurch nicht hart beendet werden und darf im Hintergrund noch fertig werden. Er schreibt höchstens Covercache, keinen Katalog. Diese Grenze ist besonders bei nicht antwortenden Netzlaufwerken relevant.

## Renderer

- `playback.ts/PlaybackLoader`: ein Eigentümer des Audioelements; vorherigen Auftrag abbrechen, Diagnose/AudioContext/Metadaten/play unter gemeinsamer Deadline, veraltete Ergebnisse ignorieren, Listener aufräumen. Bestehende Web-Audio-Kette bleibt bestehen.
- `playback.ts/QueueNavigator`: Durchlauf ohne Shuffle-Wiederholungen, getrennte Vorwärts-/Rückwärtshistorie, entfernte IDs überspringen. Historie und verbrauchte Shuffle-IDs sind laufzeitlokal; Queue/Reihenfolge/Shuffle-Modus werden persistiert.
- `playlists.ts`: regelbasierte lokale Auflösung und unveränderliches Umordnen. Main und Renderer haben bewusst sehr kleine identische Resolver; Tests prüfen Export und Darstellung.
- `VirtualSongRows.tsx`: feste 66-px-Zeilen, ab 201 Titeln nur Viewport plus Puffer im vorhandenen Scroller. Kleine Listen behalten das bisherige Verhalten.
- `music.ts`: globale Suche und Sortierung; `theme.ts`/`spicetifyThemes.ts`: unveränderte Farbquellen.
- `App.tsx`: verbleibende UI-Komposition und Einstellungszustand. Kein vollständiger Umbau. Weitere Extraktion von Settings/Theme-/Dialog-UI ist Folgeschritt.

## Shutdown und Sitzung

Alle fünf Sekunden wird der aktuelle Sitzungsstand gespeichert. Beim echten Schließen fordert Main einen letzten Snapshot an, wartet auf die IPC-Speicherung und lässt anschließend die Schreibkette auslaufen. Nach drei Sekunden ohne Renderer-Antwort wird der letzte bereits angenommene Speicherstand verwendet. Bei Minimieren in den Tray läuft die Sitzung weiter. Bei hartem Prozessabbruch/Stromausfall ist nur der letzte erfolgreiche Checkpoint zugesichert. Lautstärke bleibt Bestandteil der Einstellungen.

## Sicherheitsgrenzen

BrowserWindow: contextIsolation=true, nodeIntegration=false, sandbox=true. Privilegierte IPC-Aufrufe nur aus dem Hauptframe des eigenen Fensters; Einstellungsbereiche, Sammlungen und Session werden geprüft. Renderer kann Quellen nur über native Auswahl registrieren, Katalogpfade nicht über Patches überschreiben. Medienprotokoll löst nur registrierte 24-stellige IDs auf. Zusätzliche Fenster sind gesperrt; Navigation nur zum exakten App-Ziel. `--user-data-dir` ist eine bewusste CLI-Option, keine Renderer-Fähigkeit.

## Weitere Grenzen

Der JSON-Speicher ist pro Prozess serialisiert. Gleichzeitige Instanzen werden durch den Single-Instance-Lock verhindert. Die JSON-Datei wird vollständig geschrieben; für wesentlich größere Bestände ist ein transaktionaler inkrementeller Speicher zu evaluieren. Eine Datei-Endung ist keine Codec-Garantie. Gerätewechsel, Audioqualität und Ausgabe-Latenz benötigen Hardware-Abnahme; der Decoder-Smoke ersetzt diese nicht.
