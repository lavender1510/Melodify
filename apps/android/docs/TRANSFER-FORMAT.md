# Melodify Local Transfer — Entwurf Version 1

Ziel ist ein explizites, versioniertes Offline-Format für Windows/Android. Kein automatischer Upload oder Kopieren von Musik. Dieser Vertrag ist vorbereitet; ein JSON-Import-/Export-Dialog wird in v0.1.0 noch nicht angeboten. Der vorhandene M3U-/M3U8-Import/Export ist davon unabhängig.

```json
{
  "format": "dev.lyvt.melodify.transfer",
  "version": 1,
  "source": "android",
  "createdAt": "2026-11-09T12:00:00Z",
  "tracks": [
    {"ref": "song-1", "fileName": "Song.flac", "title": "Song", "artist": "Artist", "album": "Album", "durationMs": 180000, "size": 1234567}
  ],
  "favorites": ["song-1"],
  "playlists": [{"name": "Meine Liste", "favorite": true, "trackRefs": ["song-1", "song-1"]}],
  "appearance": {"themeId": "nocturne", "customThemes": []}
}
```

Referenzen sind dokumentlokal, keine Android-URIs oder Windows-Pfadberechtigungen. Reihenfolge und wiederholte Einträge bleiben erhalten. Importer müssen Format/Version vollständig validieren, eine Zuordnungsvorschau anbieten, mehrdeutige Treffer melden und unaufgelöste Deskriptoren erhalten. Keine stillschweigende Zusammenführung oder Ersetzung vorhandener Sammlungen. Atomare Datenbanktransaktion; vorher lokales Backup. Geräte-EQs, Audioausgänge und Lautstärke sind bewusst nicht plattformübergreifend. Hintergrundbilder/Cover benötigen später eine begrenzte, ausdrücklich eingebettete oder separat ausgewählte lokale Ressource.
