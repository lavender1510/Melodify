# Synthetische Codec-Fixtures

Erzeugt mit FFmpeg aus einem 440-Hz-Sinus von zwei Sekunden:

```
ffmpeg -f lavfi -i sine=frequency=440:duration=2 tone.wav
ffmpeg -i tone.wav tone.mp3
ffmpeg -i tone.wav tone.flac
ffmpeg -i tone.wav -c:a libvorbis tone.ogg
ffmpeg -i tone.wav -c:a libopus tone.opus
ffmpeg -i tone.wav -c:a aac tone.aac
ffmpeg -i tone.wav -c:a aac tone.m4a
```

`corrupt.mp3` enthält absichtlich nur Text, `missing.mp3` existiert absichtlich nicht. Keine fremden Musikaufnahmen. Testdaten werden nicht mit dem App-Paket ausgeliefert. Erfolg bedeutet Unterstützung genau dieser Codec-/Containerkombination, keine pauschale Formatgarantie.
