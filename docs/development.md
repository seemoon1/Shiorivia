# Local Edition development / 本地版开发

## Prerequisites / 环境

- Git; Node.js and npm (the project currently uses Next.js 14.1.0).
- For optional character asset scanners: Python 3, either installed normally or managed using [uv](https://docs.astral.sh/uv/).
- A trusted local computer. **Do not expose this development server directly to the public Internet.** See [SECURITY.md](../SECURITY.md).

## Run locally / 本地启动

```powershell
cd E:\Projects\Shiorivia  # Replace with your own checkout path
npm ci
npm run dev
```

Open `http://localhost:3000`. On Windows, `start_shiorivia.bat` is an alternative startup launcher.
Both repositories now track `package-lock.json`, so use `npm ci` for repeatable installs; use `npm install` only when intentionally updating dependencies.

Create an untracked `.env.local` in the repository root if you use provider APIs or access-code-protected actions:

```dotenv
GOOGLE_API_KEY=replace_with_your_own_key
# OPENROUTER_API_KEY=replace_with_your_own_key
# TAVILY_API_KEY=replace_with_your_own_key
ACCESS_CODE=choose_a_private_access_code
```

**No default `ACCESS_CODE` is provided.** Without it, access-code validation returns HTTP 503. Do not commit real credentials or paste them into bug reports.

## Optional asset scanners / 可选素材扫描

For example, on a Windows machine with uv managing Python:

```powershell
uv run --no-project --python 3.12 scripts/scan_live2d_local.py
uv run --no-project --python 3.12 scripts/scan_tachie.py
```

These scripts scan your own `public/live2d/` and `public/tachie/` directories and update configuration files under `src/data/`. Only use media you have permission to redistribute. The `mutsu` character ID is not a reference to the old product name.

## Verify / 验证

```powershell
npx tsc --noEmit
npm run build
```

The legacy `next.config.mjs` still suppresses some build-time TypeScript/ESLint checks; running TypeScript explicitly is important. Dependency modernization and a fuller security audit remain separate work before any public service deployment.
