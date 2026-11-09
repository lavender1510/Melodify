# Android-Prüfprotokoll

Stand 09.11.2026. Der jeweils letzte erfolgreiche Android-Check in [PR #8](https://github.com/lavender1510/Melodify/pull/8) ist maßgeblich für den finalen Commit und die dazugehörigen Artefakte.

## Ausgeführt

- Lokal mit vollständigem JDK 21, AGP 9.5.1, Gradle 9.6.0 und SDK 37.0: **11 JVM-Tests erfolgreich**, einschließlich aktueller Scan-Merge-Regeln. Kotlin sowie Android-Instrumentationstestcode kompilieren. Akzent-/Mehrwortsuche, geordnete Queue/Duplikate, M3U/BOM/Pfade/übersprungene URLs, IDs, LRC-Zeitstempel/Offsets/Plaintext und begrenztes Einlesen großer Dokumente wurden geprüft.
- Regression: aktuelle Favoriten und Hörstatistiken bleiben beim Scan-Merge erhalten; Metadatenfehler und fehlende Dateien erhalten bekannte Informationen. Der Room-DAO liest den aktuellen Stand erst innerhalb der Commit-Transaktion.
- Suche mit 50.000 synthetischen Metadatensätzen: ca. **29 ms** in einem lokalen JVM-Durchlauf nach Vorberechnung der Suchbegriffe. Dies ist kein Android-Frame-/Scroll-Benchmark und keine reale Dateibibliothek.
- Lokaler Debug-Paketbau und Lint erfolgreich. Paketkennung `dev.lyvt.melodify.android`, Version 0.1.0, minSdk 29, targetSdk 37 und Debug-Signatur mit Android-Buildwerkzeugen geprüft. Kein INTERNET im Manifest; ACCESS_NETWORK_STATE wird ebenfalls entfernt.
- Erster kompletter Android-CI-Lauf [42606232477](https://github.com/lavender1510/Melodify/actions/runs/42606232477) für `5992e2b`: erfolgreich. Neun damalige JVM-Fälle, Lint, APK-Bau und **drei native Instrumentationstests auf API 35** waren grün. Diese prüfen transaktionale Room-Reihenfolge/Favoriten/fehlende Referenzen, native Compose-Navigation/Playlist/Theme sowie MediaStore-Scan einer eigenen WAV-Datei und echte MediaSessionService-Wiedergabe mit fortschreitender Zeit bei gestoppter Activity, Pause/Seek/Queue/Shuffle/Repeat und gespeichertem Sitzungsstand.
- Release-APK und AAB wurden mit R8/Ressourcenverkleinerung gebaut. Größen im ersten vollständigen CI-Durchlauf: unsigned APK ca. 5,1 MiB, unsigned AAB ca. 6,9 MiB; die unoptimierte Debug-Test-APK ca. 71 MiB. Release-Artefakte bleiben ohne Produktionsschlüssel unsigned.
- Nachfolgende Validierung ergänzt einen tatsächlichen Service-Neustart: Queue, Index, Position und Modi müssen pausiert wiederhergestellt werden. Der finale PR-Check führt alle aktuellen Tests erneut aus.
- Der Screenshot-Export erhält die Emulator-Testinstallation bis nach dem Kopieren; PNG-Dateien werden auf gültige Signatur geprüft. Screenshots und JUnit-/Lint-Berichte liegen bei den CI-Artefakten.
- Windows unverändert: lokal 23 Vitest-/18 Node-Fälle und TypeScript/Vite erfolgreich; komplette Windows-CI einschließlich NSIS-/Portable-Smokes auf dem Android-Branch ebenfalls grün (z. B. [42605392795](https://github.com/lavender1510/Melodify/actions/runs/42605392795)). Windows-Versionsnummer und -Workflows wurden nicht verändert.

## Ausführungsgrenzen

Lokal fehlt KVM (Emulator `-accel-check`: CPU unterstützt kein vmx/svm). Ein lokaler Systemimage-Installationsversuch scheiterte; es wird kein lokaler Emulator-Erfolg behauptet. Die tatsächlich ausgeführten Gerätetests laufen auf dem beschleunigten GitHub-Emulator API 35. Keine realen Geräte angeschlossen, kein Lauf auf API 29/anderen Android-Versionen behauptet.

Nicht ausgeführt: physische Bluetooth-/Kabel-Headsets, Anrufe und konkurrierende Audio-Apps, OEM-Akkuoptimierung, echte SD-Karten/SAF-Provider, alle Decoder-/Containerkombinationen, große reale Dateibibliotheken, Stromausfall, alle Paletten auf jeder Displaygröße und ein Store-/produktionssignierter Installationspfad. Der Android-Codec-Nachweis beschränkt sich auf die tatsächlich verwendete PCM-WAV-Fixture; Windows-Codec-Ergebnisse sind kein Android-Nachweis.

Lint wird nicht durch eine Baseline oder deaktivierte Prüfungen umgangen. Verbleibende Hinweise betreffen u. a. Stil-/KTX-Empfehlungen, neuere Gradle-Version und den absichtlich exportierten MediaSessionService. Dieser akzeptiert nur eigenen UID/vertraute Systemcontroller; fremde Controller dürfen die private Queue nicht durch beliebige URIs ersetzen.

Kein Android-Release veröffentlicht. Der ausschließlich vorbereitete Preview-Entwurf enthält eine installierbare Test-APK und eindeutig gekennzeichnete unsigned Release-Pakete.
