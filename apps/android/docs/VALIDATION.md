# Android-Prüfprotokoll

Stand: Umsetzung und erste Build-/Testdurchläufe laufen. Erfolgreiche Endergebnisse werden vor Abschluss hier und im Pull Request ergänzt. Kein Test wird allein aufgrund vorhandenen Testcodes als bestanden behandelt.

Vorhandene Prüfungen:

- JVM: Mehrwort-/Akzentsuche, Queue-Reihenfolge/Duplikate, M3U/BOM/Windows-Pfade/übersprungene URLs, stabile IDs, Suche mit 50.000 Metadatensätzen, LRC-Zeitstempel/Offsets/Plaintext.
- Android Room: transaktionale Reihenfolge, fehlende Referenzen, Favoriten, Playlist-Löschung erhält Tracks.
- Compose: native Navigation, Playlist erstellen, Theme-Vorschau/anwenden.
- Media3-Service: eigene PCM-WAV-Fixture in MediaStore, echter Scan, echte Service-Wiedergabe und fortschreitende Medienzeit, Hintergrund-Activity, Pause/Seek/Queue/Shuffle/Repeat und Sitzung speichern.
- Buildziele: Debug-APK, unsigned Release-APK, unsigned AAB; Lint und Instrumentation-Testkompilierung.

Nicht automatisch abgedeckt: physische Bluetooth-/Kabel-Headsets, Anrufe und konkurrierende Audio-Apps, OEM-Batteriemanagement, echte SD-Karten/SAF-Provider, alle Decoder-/Containerkombinationen, große reale Dateibibliotheken, Stromausfall, alle Themes auf jeder Displaygröße. Diese bleiben ausdrücklich Geräte-Abnahme. Kein Produktions-Signaturschlüssel vorhanden, daher ausschließlich Test- bzw. unsigned Artefakte. Kein Android-Release veröffentlicht.
