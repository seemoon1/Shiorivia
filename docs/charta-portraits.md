# Charta stage portraits (Local Edition)

Charta profiles are stored under the project root at `data_storage/charta/characters.json`.
Uploaded illustrations are stored separately under `data_storage/charta/portraits/`;
profile JSON records the relative local API URL in `portrait`. These files are
**not committed** (the directory is covered by `.gitignore`). Back up the entire
`data_storage/charta/` folder, not just the JSON, when moving to another computer.

- Upload a PNG, JPEG or WebP of up to 8 MB through Charta > Stage illustration.
- Transparent PNG/WebP is recommended. No automatic crop is applied to the full-body art.
- The stage shows the illustration only when that character has one. The small
  Charta profile avatar is **not** a replacement stage element.
- Deleting a Charta character removes its disk portrait. Clearing its portrait
  field removes it from the stage; unused image files may remain until replaced.
- Legacy browser-only Charta profiles are migrated once on first launch; they are
  left in browser storage if migration fails. Imported/exported JSON currently
  does not bundle image files; importing a profile clears its machine-local
  `portrait` reference. Move images through Charta after import.

## Live2D distribution boundary

Live2D is **off by default** while license compatibility is reviewed.
`public/lib/live2dcubismcore.min.js` is proprietary and must not be included in
open-source releases. A developer who has obtained the SDK under applicable
license terms may place their own local copy there and opt in with
`NEXT_PUBLIC_ENABLE_LOCAL_LIVE2D=true` in `.env.local`. The file is ignored by
Git, but an already committed copy must also be removed from the Git index:

```sh
git rm --cached -- public/lib/live2dcubismcore.min.js
```

This prevents future normal commits from containing the file, **not** existing
Git history or previously released archives. Review historic distribution and
any other proprietary Live2D binaries separately before a public release.
Do not expose this local-only image/file API on an internet-facing server.
