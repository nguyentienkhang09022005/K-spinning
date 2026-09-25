# Changelog

All notable changes to K-spinning are documented here.
Versions follow [Semantic Versioning](https://semver.org/).

## 1.0.0 (2026-09-26)

First release of K-spinning, a lightweight gateway for rotating AI provider accounts.
Based on [decolua/9router](https://github.com/decolua/9router) v0.5.86 (MIT); the upstream
history is not carried over.

### Changed
- Rebranded the dashboard to K-spinning: name, logo, favicon, PWA icons.
- Ports come from env: `PORT` (production, default 26015) and `DEV_PORT` (dev, default 699),
  read by `scripts/run-next.mjs`; defaults live in `src/shared/constants/ports.json`.
- Dark theme only.
- Dashboard login is password-only.
- The donate button is hidden until `DONATE_CONFIG` points at your own data source.

### Removed
- Auto-update (in-app `npm i -g 9router`), version check and changelog fetch from upstream.
- Google Analytics.
- MITM proxy (root CA install, hosts-file redirects).
- Cloudflare tunnel and Tailscale.
- PXPIPE prompt-to-image compression.
- Landing page, SAML and OIDC single sign-on.
- 9Remote, 9English and Skills pages.
