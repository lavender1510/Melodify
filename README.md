# Melodify 🎧

Lokaler Musikplayer für Windows 10/11. Kein Konto, kein Streamingzwang, keine Telemetrie.

## v0.2.0 – Upgrade im Review

Die visuelle Identität, acht Melodify-Themes, 114 Spicetify-Paletten und eigene Themes bleiben erhalten. Equalizer, Visualisierung, Balance, Vorverstärkung, Dynamikkompression und unterstützte Audioausgabe bleiben Teil der App.

- Abbrechbare Songwechsel mit 15-Sekunden-Ladegrenze und verständlichen Decoder-/Dateifehlern.
- Serialisierte, atomare lokale Speicherung mit Schema-Migration, validiertem Backup und expliziter Wiederherstellung. Beschädigte Daten sperren das Speichern; Originalbytes werden bei Wiederherstellung archiviert.
- Ordner hinzufügen, einzeln/gesamt scannen, Scan abbrechen, Ordner aus der Verwaltung entfernen und optional überwachen. Keine Musikdateien werden gelöscht. Fehlende Tracks und Playlist-Verknüpfungen bleiben erhalten.
- Sitzung mit Titel, Position, Queue, Repeat, Shuffle und Lautstärke wiederherstellen; Musik startet erst nach einer bewussten Wiedergabeaktion.
- Queue per Drag-and-drop sortieren, entfernen/leeren, als Nächstes/später ergänzen; Shuffle ohne Wiederholungen innerhalb eines Durchlaufs und nachvollziehbare Zurück-Historie.
- Playlist erstellen/umbenennen/löschen, Titel hinzufügen/entfernen, manuell per Drag-and-drop oder Menü sortieren, duplizieren, Cover wählen; M3U/M3U8 importieren/exportieren. Native Dateiauswahl bleibt erhalten, Eingabe/Bestätigung erfolgt in App-Dialogen.
- Intelligente Playlists für Favoriten und die 100 zuletzt hinzugefügten Titel, ausschließlich lokal.
- Große Songlisten rendern nur sichtbare Zeilen plus Puffer. Globale Suche bleibt mehrteilig und akzentunabhängig.

## Entwicklung

Node.js 24, npm und Windows für die Windows-Pakete. Abhängigkeiten sind durch `package-lock.json` fixiert.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run test:audio
npm run test:codecs
npm run test:desktop
npm run dist:win
```

Auf Linux brauchen sichtbare Desktop-Tests einen X-Server (z. B. `DISPLAY=:99 npm run test:desktop`). Der bestehende Audio-Smoke läuft hier mit `electron --no-sandbox --ozone-platform=headless --disable-gpu electron/audio-smoke.cjs`. `--no-sandbox` wird ausschließlich für die isolierte Linux-Testumgebung verwendet; die ausgelieferte BrowserWindow-Konfiguration aktiviert die Renderer-Sandbox.

Die Windows-CI baut NSIS und portable ZIP, prüft Installation, App-Start, Sitzung und Deinstallation sowie den Start aus der entpackten ZIP. **Die Pipeline veröffentlicht keine Releases.** Veröffentlichungen benötigen gesonderte Freigabe.

## Daten und Wiederherstellung

Windows: `%APPDATA%/Melodify/library.json` (der genaue Profilordner richtet sich nach Electron-App-Name/Installation). Daneben liegen `library.json.backup` und Covercache. `--user-data-dir=<Pfad>` erlaubt ein separates Profil.

Ein beschädigter oder unbekannter Datenstand wird niemals automatisch überschrieben. Der Schutzdialog kann das letzte validierte Backup ausdrücklich wiederherstellen. Zuvor wird das vorhandene Original als `library.json.damaged-<Zeitstempel>` gesichert. Ohne lesbares Backup bleibt das Original unverändert; eine manuelle Reparatur ist dann erforderlich. Vor einer manuellen Reparatur App vollständig beenden und den gesamten Profilordner kopieren. Ein Single-Instance-Lock verhindert gleichzeitige App-Instanzen mit demselben Profil.

## Grenzen und Testnachweise

- Scan erkennt MP3, FLAC, WAV, OGG/Vorbis, Opus, AAC und M4A als Kandidaten. Tatsächliche Wiedergabe hängt von Container, Codec und Electron/Plattform ab. Ein erfolgreicher Test einer synthetischen Datei garantiert nicht jede Datei mit derselben Endung.
- Ausgabegerätewechsel setzt geeignete Web-Audio-Unterstützung im Electron-Build voraus. Entfernte Geräte fallen soweit erkennbar auf Systemstandard zurück; physische Gerätewechsel müssen unter Windows getestet werden.
- Dynamikkompression ist **kein ReplayGain**. Crossfade und Gapless werden nicht als unterstützt angeboten.
- Metadatenänderungen in Originaldateien, Lyrics, Hörstatistiken, zusätzliche Smart-Regeln, Mini-Player-Fenster und weiterer Desktop-Komfort folgen in P2/P3.
- Fehlende Tracks werden nicht automatisch mit einer verschobenen Datei verknüpft. Entfernte Ordner behalten ihre Katalogeinträge bewusst; dies ist kein Löschen der Bibliothek.
- M3U-Import verknüpft vorhandene Katalogeinträge. Unbekannte Pfade und Online-URLs werden gezählt und gemeldet. Export verwendet absolute lokale Pfade und UTF-8 mit BOM, auch bei `.m3u`.
- Ordnerüberwachung ist optional, debounced und vom Betriebssystem/Datenträger abhängig. Keine zuverlässige Überwachung getrennter Netzlaufwerke zugesichert.
- Keine Codesignatur, kein Auto-Updater. SmartScreen kann bei unsignierten Paketen warnen.

Analyse, Teststand, Einschränkungen und nächste Schritte: [Projektanalyse](docs/UPGRADE-ANALYSIS.md), [Architektur](docs/ARCHITECTURE.md), [Prüfprotokoll](docs/VALIDATION.md), [Changelog](CHANGELOG.md).

## Sicherheit

Context Isolation, Renderer-Sandbox, kein Node im Renderer, kleine Preload-Bridge, Prüfung des IPC-Absenders und validierte Patches. Medienzugriff über registrierte IDs statt frei angegebener Pfade. CSP und Navigations-/Fenstersperren bleiben aktiv. Kein neuer Netzwerkdienst.

## Tastatur

Leertaste: Play/Pause außerhalb von Eingabefeldern. Escape: Dialoge, Queue und erweiterte Wiedergabe schließen. Enter: fokussierten Titel abspielen. Playlist-Reihenfolge alternativ im Titelmenü mit „nach oben/unten“ ändern.

MIT. Herkunft der zusätzlichen Paletten: [THIRD_PARTY_THEMES.md](THIRD_PARTY_THEMES.md).
