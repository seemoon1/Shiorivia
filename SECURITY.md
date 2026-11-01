# Shiorivia Local Edition — Security Notes / 安全说明

**Local-first is not an invitation to public hosting.** The local application includes file storage, local code execution and plugin/media routes that assume a trusted device. Do not expose its Next.js server to the Internet or an untrusted LAN without a separate security design and authentication.

**本地版不等于可直接公网部署。** 当前源码包含文件保存、代码执行等基于可信本机环境设计的接口。除非完成额外鉴权和隔离，否则不要将本地服务端口直接暴露到公网或不受信任的局域网。

- Keep `.env.local`, API keys and `data_storage/` out of Git; rotate keys if accidentally disclosed.
- LLM prompts, media and search queries are sent to the providers you choose; check their policies.
- The project uses Next.js 16.4.3; run explicit TypeScript and dependency checks. Framework upgrades do not replace a security audit.
- Treat any community-provided character scripts, assets or plugin code as untrusted; review before executing.
- Report security concerns privately to the maintainers once a private channel has been published. Avoid posting exploitable details or secrets in public Issues.

For hosted BYOK deployments, see the separate `Shiorivia_Cloud` repository and its `SECURITY.md`. This file is guidance, not a completed security audit.
