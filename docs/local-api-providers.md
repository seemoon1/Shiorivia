# Local API providers / 本地 API 供应商

Shiorivia Local reads API credentials from **server-side `.env.local`**. Do not use `NEXT_PUBLIC_` prefixes for secrets, and never commit `.env.local`.

## Built-in providers / 内置供应商

- DeepSeek (official): `DEEPSEEK_API_KEY`
- OpenRouter: `OPENROUTER_API_KEY`
- Google Gemini: `GOOGLE_API_KEY`

Configure at least one provider. Restart the Next.js dev server after changing `.env.local`. The Local model picker attempts to load the selected provider's live `/models` list; when unavailable it shows offline fallback IDs (which may not be accessible to your account). You can enter a model ID manually in the picker.

## Up to four Custom providers / 最多四个自定义供应商

For each `N` from 1 to 4, configure an **OpenAI Chat Completions compatible** service:

```env
SHIORIVIA_CUSTOM_1_BASE_URL=https://your-provider.example/v1
SHIORIVIA_CUSTOM_1_API_KEY=replace-with-your-secret
```

Repeat the same pattern for `CUSTOM_2`, `CUSTOM_3`, and `CUSTOM_4` if needed. Both values must be set. `BASE_URL` is the API root (usually ending in `/v1`), **not** the `/chat/completions` endpoint. Custom endpoints must support `POST /chat/completions` and streaming; `GET /models` is optional if you enter model IDs manually. A local HTTP address is allowed for trusted services on your own machine. Never point a custom URL to a service you do not trust: chat content and prompts are sent to that provider.

## Visible provider slots / 供应商栏

Custom providers have first priority, followed by DeepSeek, OpenRouter and Google. At most **four** configured, enabled providers are shown at one time. Open Settings → AI & Models to disable or enable a configured provider. This preference only controls the Local UI and is stored in browser localStorage; API keys remain in `.env.local`. Disable a custom provider as needed to make room for other providers.

The selected provider and enabled/disabled preferences are shared by Engineering and Story modes. Model IDs are specific to each provider. A manually entered ID is passed to the selected provider unchanged; verify that your account can access it. The chat and automatic memory summaries route through the same provider and selected model. For best results, choose a text-generation model for sessions using automatic memory.

**Security:** This is Local Edition software for a trusted local development environment. Custom base URLs are set by the machine owner. Do not expose Local's server/file execution APIs on the public internet.
