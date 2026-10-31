# Contributing to Shiorivia / 参与贡献

Thanks for helping Shiorivia! / 感谢你参与星轨项目。

## Getting started / 开始开发

1. Read [SECURITY.md](SECURITY.md), [BRANDING.md](BRANDING.md), and [TRADEMARKS.md](TRADEMARKS.md).
2. Follow [docs/development.md](docs/development.md) to run the Local Edition.
3. Create a focused branch, keep changes small, and test what you changed.
4. Open an Issue or Pull Request describing the motivation, changes, and test results.

请先阅读安全与品牌政策，按照开发指南配置环境。尽量让每次 PR 专注一件事，并写清用途、改动和验证方式。

## Before opening a PR / 提交前检查

- Run `npm ci`, `npx tsc --noEmit`, and `npm run build` where possible. Report pre-existing failures honestly.
- Never commit `.env.local`, provider API keys, session data, private chat logs, or files under `data_storage/`.
- Do not contribute copyrighted character art, Live2D models, commercial music, or other third-party material without clear redistribution rights and attribution.
- Do not rename the fictional character ID `mutsu` as part of a product-brand cleanup.
- Security issues should be reported privately through a maintainer-designated channel when available; do not publish secrets or exploit details in Issues.

源码遵循 [AGPL-3.0](LICENSE)；官方名称及视觉标识另见 [TRADEMARKS.md](TRADEMARKS.md)。贡献代码不自动获得商用官方品牌授权。
