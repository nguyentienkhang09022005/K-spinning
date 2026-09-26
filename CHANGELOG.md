# Changelog

All notable changes to K-spinning are documented here.
Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

### Added
- npm package `k-spinning` (`cli/`): `npm i -g k-spinning`, then run `k-spinning`. Default port
  26015.
- Antigravity IDE MITM is back (Dashboard → CLI Tools → MITM Tools), restored from 9router
  v0.5.86 and limited to Antigravity. Its chat traffic now rotates through K-spinning's
  accounts and combos instead of the account logged in to the IDE.
- Catch-all mapping (`*`): every Antigravity chat model without its own mapping is routed too,
  so nothing silently falls back to the IDE's logged-in account. Tab-autocomplete still passes
  through natively.

### Changed (compared with 9router's MITM)
- Windows no longer needs "Run as Administrator": trusting the Root CA and editing the hosts
  file each raise a UAC prompt. Hosts cleanup on shutdown does the same, so entries never
  outlive the app. Upstream refused to start, or failed silently, without admin.
- Forwards to the port this instance runs on (`PORT`/`DEV_PORT`) instead of a hardcoded
  `localhost:20128`. A URL is saved only when you change it.
- State lives in `<DATA_DIR>/k-spinning-mitm/`, and the Root CA is named
  "K-spinning MITM Root CA". It can be installed next to upstream 9router without either
  deleting the other's CA, PID file or alias cache. Shutdown only removes hosts entries that
  K-spinning wrote itself.
- DNS toggle errors are shown in the UI instead of being swallowed, and mappings can be
  edited before DNS is enabled.

### Changed (CLI / data)
- Default data directory is now `%APPDATA%\k-spinning` (Windows) or `~/.k-spinning`
  (macOS/Linux), instead of upstream's `9router` folder. `DATA_DIR` still overrides it.
  Existing installs that relied on the old default must set `DATA_DIR` or move the folder.
- The launcher only kills processes started from its own install directory. Upstream killed
  every `next-server` and every node process with `9router` in its command line, which
  also took down dev servers and a side-by-side 9router.
- Autostart entries (`k-spinning.vbs`, `com.k-spinning.autostart`, `k-spinning.desktop`) and
  the runtime folder are separate from upstream 9router's.
- The CLI build no longer ships `*.nft.json` trace manifests, the build-time HOME
  (`.build-home`, which holds Next telemetry IDs) or a baked-in build-machine path for the
  MITM server. Telemetry is disabled during the build.

### Security (MITM)
- The MITM listens on `127.0.0.1` only. Upstream listened on every interface while injecting
  the API key, so any LAN host could use your accounts.
- The Root CA carries Name Constraints (`googleapis.com` only). A leaked key can no longer
  impersonate other sites; TLS rejects them with "permitted subtree violation". An existing
  unconstrained CA is replaced automatically on the next Start Server (one UAC prompt).
  `rootCA.key` is readable by the current user only.
- Leaf certificates are minted only for the intercepted hosts, never for an arbitrary SNI.
- Passthrough to Google verifies the upstream certificate. Upstream used
  `rejectUnauthorized: false`, which exposed the IDE's Google token to on-path attackers. Behind
  a TLS-inspecting corporate proxy, set `MITM_INSECURE_UPSTREAM=1`.

### Fixed (MITM)
- UAC elevation failed with "The string is missing the terminator" (cmd.exe cut the wrapper).
- The Trust Cert button always got `400 tool and action required`.
- First Start Server crashed with `ENOENT … .mitm.lock` when the MITM folder did not exist yet.

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
