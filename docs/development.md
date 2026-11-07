# Local Edition development / 本地版开发

## Prerequisites / 环境

- Git; Node.js 24 and npm (see `.nvmrc`; Next.js 16.4.3).
- Character sprites are uploaded in Charta; retired background, Live2D and sprite scanners are no longer required.
- A trusted local computer. **Do not expose this development server directly to the public Internet.** See [SECURITY.md](../SECURITY.md).

## Run locally / 本地启动

```powershell
cd E:\Projects\Shiorivia  # Replace with your own checkout path
npm ci
npm run dev
```

Open `http://localhost:3000`. On Windows, `start_shiorivia.bat` is an alternative startup launcher.
Both repositories now track `package-lock.json`, so use `npm ci` for repeatable installs; use `npm install` only when intentionally updating dependencies.

If you need provider API keys or access-code-protected actions, make an untracked local copy of the **placeholder-only** template:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` and fill in only the values you use. Empty values in the example are intentional; do not put real secrets in `.env.example`.

**No default `ACCESS_CODE` is provided.** Without it, access-code validation returns HTTP 503. Do not commit real credentials or paste them into bug reports. `.gitignore` helps prevent accidents but does not protect secrets that were already committed; rotate any exposed key.

## Local assets / 本地素材

Open **Charta** to upload a portrait for a custom character. See [Charta portraits](charta-portraits.md).
For optional image generation with ComfyUI or a configured image provider, see [Image Studio](image-studio.md).
Live2D remains paused pending licensing review. You must supply artwork you have the right to use.
Automatic full background switching is disabled; user-picked backgrounds remain supported.

## Verify / 验证

```powershell
npx tsc --noEmit
npm run build
```

The legacy `next.config.mjs` still suppresses some build-time TypeScript/ESLint checks; running TypeScript explicitly is important. Dependency modernization and a fuller security audit remain separate work before any public service deployment.

### Debug model output / 终端输出模型原文

In **Settings → Developer**, turn on **终端输出 AI 完整原文** to print each raw AI stream in the Node.js terminal (including `<thinking>` and `<game_state>` tags) after completion. Interrupted streams are marked accordingly. This is off by default and is independent of the frontend Debug Mode. These logs can contain private conversations; do not share them or run the local server on untrusted networks.

In Via Lata, the header reset button clears the current session's messages and generated state, including memories, POV lock, cast, timeline, suggestions, status and current worldline event. It retains user-authored world/ERA/PERIOD, self profiles and global lore. **Save to disk manually after reset**, because incremental auto-sync does not persist deletions.
