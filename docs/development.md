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

### AI request and response diagnostics / AI 请求与原文调试

In **Settings → Developer**, **终端输出发送给 AI 的完整请求** (above the response switch) prints the final model request before dispatch: the system instructions, selected conversation history, model and generation parameters. This includes story worldline and memory injected by the backend. For Google Gemini, it displays the actual `systemInstruction`, `startChat.history` and `sendMessageStream` arguments; OpenAI-compatible providers display Chat Completions messages and parameters. API keys are never included.

**终端输出 AI 完整原文** independently logs the raw AI stream (including `<thinking>` and `<game_state>` tags) after completion; interrupted streams are marked accordingly. Both switches are off by default, apply to the Local chat API (including Via Lata state repair and VIAE), and are independent of frontend Debug Mode. Request logs may contain private conversations, story lore or attached image data: do not share terminal logs or run the local server on untrusted networks.

In Via Lata, regenerating the **latest AI reply** or editing the **latest user message** restores the saved pre-turn story state before requesting another answer. This includes protagonist/cast statuses, suggestions, timeline, memories, scene settings, POV lock and the current worldline event; user-authored world/ERA/PERIOD and Charta profiles are preserved. Deleting the latest turn also rewinds its state. **Save to disk manually after deletions or edits**, because incremental auto-sync does not persist destructive changes.

### Via Lata cast routing / 故事登场角色

Once a story worldline is configured, the right sidebar offers a compact multi-select cast picker (up to six characters). All built-in characters belong to BanG Dream!. Charta characters may optionally bind to an existing world; unbound characters remain world-neutral. Characters bound to another world are available only with the explicit cross-world switch. If a foreign-world character is selected, the AI receives that character's original world description as well as their character biography.

The chosen cast supplies full lore for the **current** generation. `<game_state>.sceneCastIds` identifies actors in the completed scene, while `nextSceneCastIds` proposes the cast for the **next** turn. The UI adopts that prediction after each valid story state; overriding it after the story begins requires confirmation. If no cast is selected, only a lightweight names/IDs roster is supplied, so character fidelity may be lower until the next turn. Old saves without `storyNextCastIds` fall back to `sceneCastIds`.

Via Lata's `<game_state>` now requests only live protagonist status (`name`, `timeDesc`, `environment`, `temperature`, `clothing`, `sensation`, `innerState`), scene cast IDs, other characters' relationship/status data, plot suggestions, danmaku, timeline and music. The top-level `environment`, `live2d`, `effect`, `age` and `gender` output requirements are retired. `protagonist.environment` remains visible as **Env** in the story sidebar; pre-existing archive fields remain readable. In participant mode the self is `protagonist` only, never a relationship target in `character[]`.
