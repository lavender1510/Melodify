# Changelog

## 0.2.0 – unveröffentlicht

### Stabilität und Daten
- Audio-Ladeaufträge mit Abbruch, 15-Sekunden-Timeout und Fehler-Recovery.
- Serialisierte unveränderliche Speicher-Snapshots; validierte Legacy-Migration auf Schema 1; atomarer Austausch, Backup und explizite Recovery mit Originalarchiv.
- Renderer-Sandbox, IPC-Absender-/Datenprüfung und exakte Navigationsziele.
- Sitzungscheckpoint und Close-Handshake; Restore ohne Autoplay.

### Bibliothek und Organisation
- Selektive Scans, Abbruch, Fehler-/Ordnerstatus, optionale Überwachung und Entfernen von Quellen ohne Dateilöschung.
- Fehlende Titel behalten IDs, Metadaten, Favoriten und Playlist-Verknüpfungen.
- Shuffle-Durchlauf/Historie, Queue leeren, erhaltene manuelle Playlist-Reihenfolge, DnD und Tastatur-Alternative.
- Eigene Playlist-Dialoge, Duplikate, Cover und M3U8/M3U-Export; Import meldet ausgelassene Einträge.
- Lokale Smart-Playlists für Favoriten/zuletzt hinzugefügt; virtuelle Songlisten und memoisiert gefilterte Ergebnisse.

### Qualität
- Bestehende Suche-/Theme-/Byte-Range-/Audio-Smokes erhalten; Vitest und Node-Testsuche getrennt.
- Neue Speicher-, Scan-, Queue-, Playlist-, Audio-Lader-, Last- und Desktop-Tests.
- Lockfile; Windows-Pakete und Installations-/Portable-Smokes ohne automatische Veröffentlichung.
- Offene Windows-/Hardware-Abnahme und Grenzen siehe docs/VALIDATION.md.

## 0.1.6
- Globale Bibliothekssuche repariert.
- NSIS-Installer zusätzlich zum portablen ZIP.

## 0.1.5
- 114 adaptierte Spicetify-Paletten.

## 0.1.4
- Audio-, Splash- und Branding-Verbesserungen.
