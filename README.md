# Melodify 🎧

**A refined, local-first music player for Windows.** Inspired by the clarity of Samsung Music, designed for the desktop.

## Included in the 0.1.1 preview

- Local library scanning for MP3, FLAC, WAV, OGG, Opus, AAC, and M4A (playback depends on Chromium's installed codecs).
- Embedded album art and folder covers, local metadata, artists, albums, folder view, searching, sorting, and favorites.
- Play/pause, seek, skip, shuffle, repeat, queue with drag-to-reorder, play next, and mini / expanded Now Playing views.
- Create, rename, remove, favorite playlists; import `.m3u`/`.m3u8` playlist references to songs already in the library.
- 8 curated themes plus custom theme editor for colors, corner radii, translucency, and background pictures.
- 10-band Web Audio equalizer, seven presets, balance, gain, optional dynamic compression, output device selection (where supported).
- Audio frequency visualizer, minimize-to-tray, keyboard controls and media session metadata.
- Persistent state is stored locally under the Windows per-user app data directory.

## Getting started

Requirements: Node.js 22+ and Windows 10/11.

```bash
npm install
npm run dev
```

To build the frontend:

```bash
npm run build
npm test
```

To package `.exe` NSIS and portable builds **on Windows**:

```bash
npm run dist:win
```

Every push to `main` builds Windows packages via GitHub Actions and publishes a **v0.1.1 prerelease** when the workflow succeeds.

## Known preview limitations

- The app scans **user-selected folders**, not all drives automatically. This avoids accessing files without permission.
- Importing M3U files links songs already in your library; unmatched or remote URLs are skipped.
- Only audio codecs supported by the local Electron/Chromium installation can be played; a visible error is shown otherwise.
- Audio "normalization" here is optional **dynamic compression**, not album-specific ReplayGain analysis.
- Media key support uses Chromium's Media Session implementation and may depend on Windows version/system settings.
- This preview has **no code-signing certificate**; Windows SmartScreen may warn about unsigned executables.
- No auto updater or library folder removal UI yet. This is an initial functional release, not a feature-complete 1.0.

## Security

Renderer runs without Node integration and with context isolation. Electron main exposes only a small IPC API through preload. Songs and covers are served only by whitelisted, indexed IDs; no arbitrary paths may be requested via the media protocol. No cloud upload or telemetry.

## Keyboard

- `Space`: play/pause when not typing in a field
- `Escape`: close now playing, queue, and song menus

## License

MIT
