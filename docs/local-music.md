# Shiorivia Local Music Library

Place music files in the repository-root `music/` directory (this is **not** `public/music/`). Supported audio extensions: `.mp3`, `.m4a`, `.aac`, `.ogg`, `.wav`, `.flac` (playback depends on the browser's codec support).

Recommended filename: `Artist - Song Title.mp3`. For synced lyrics, place `Artist - Song Title.lrc` alongside it. You can use subfolders (up to four levels); no system-wide disk scan is performed. Filenames without ` - ` are indexed as `Unknown Artist`.

Open Music Player → **Scan local music** → confirm. The server rebuilds `data_storage/music-library.json` and refreshes the player. Repeat this whenever adding, removing, or renaming files. Scanning updates the index, not the music files. The index and `music/` audio files are excluded from Git; `.gitkeep` is the only exception.

Shiorivia supplies the AI only with song titles and artist names, not audio files or LRC content. Avoid extremely obscure or very recent tracks for reliable music-selection decisions. Legacy `src/data/bgm_library.ts` entries still work.

The local audio endpoint only serves paths present in the scanned index, checks real filesystem paths to block traversal and symlink escapes, and supports HTTP byte ranges for seeking. Run Shiorivia Local only on a trusted computer/network; it does not implement multi-user authentication.
