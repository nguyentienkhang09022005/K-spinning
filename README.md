<div align="center">
  <img src="./public/logo.png" alt="K-spinning" width="120"/>

  # K-spinning

  **A local AI gateway that rotates your AI provider accounts behind one OpenAI-compatible endpoint.**

  [![npm](https://img.shields.io/npm/v/k-spinning.svg)](https://www.npmjs.com/package/k-spinning)
  [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

</div>

---

## What it does

Point Claude Code, Codex, Cline, OpenCode, Cursor or any OpenAI/Claude-compatible tool at
`http://localhost:26015/v1`. K-spinning picks an account, translates the request to that
provider's format, and moves on to the next account or model when one runs out of quota or
fails.

```
 Your tool ──► http://localhost:26015/v1 ──► K-spinning ──► account 1 / account 2 / … (rotation)
                                                  │        └► next model in the combo (fallback)
                                                  └ format translation · token refresh · quota & usage
```

- **Account rotation**: several accounts per provider, round-robin or sticky, with automatic
  fallback when an account is rate-limited or out of quota.
- **Combos**: chain models across providers (for example subscription → cheap → free).
- **40+ providers**: OAuth or API key, with automatic token refresh.
- **Format translation**: OpenAI ↔ Claude ↔ Gemini ↔ Responses API, handled for you.
- **Quota and usage dashboard**: per account, per model and per API key.
- **Antigravity IDE routing**: a local MITM sends the IDE's chat traffic through your
  K-spinning accounts instead of the account logged in to the IDE.
- **Token saver (RTK)**: compresses large tool outputs before they reach the model.

## Quick start

Requires **Node.js 18+** (22+ recommended).

```bash
npm i -g k-spinning
k-spinning
```

1. Choose **Web UI** in the menu, or open `http://localhost:26015/dashboard`.
2. Log in with the default password `123456`, then change it in **Profile**.
3. **Providers** → connect one or more accounts.
4. **Endpoint** → create an API key.
5. In your tool, set:
   ```
   Base URL: http://localhost:26015/v1
   API key:  <the key from step 4>
   Model:    <provider>/<model> or a combo name
   ```

The **CLI Tools** page can write this configuration for supported tools automatically.

### Command-line options

```
k-spinning [options]

  -p, --port <port>   Port (default: 26015)
  -H, --host <host>   Bind address (default: 0.0.0.0; use 127.0.0.1 for local-only)
  -n, --no-browser    Don't open the browser
  -l, --log           Show server logs
  -t, --tray          Run in the system tray (background)
  --skip-update       Skip the update check
  -v, --version       Show version
```

Update with `npm i -g k-spinning@latest`, and remove with `npm uninstall -g k-spinning`.

## Antigravity IDE

Antigravity has no setting for a custom endpoint, so K-spinning intercepts it locally.

1. **Dashboard → CLI Tools → MITM Tools → Antigravity**
2. **Start Server**. On Windows, accept the UAC prompt; this trusts a local certificate.
3. Map models, or set the **All other models (catch-all)** row to a combo.
4. **Start DNS** (another UAC prompt), then fully quit and reopen Antigravity.

Safeguards:
- The MITM listens on `127.0.0.1` only.
- Its certificate can only sign `*.googleapis.com` (Name Constraints).
- Its private key is readable by your user only.
- It verifies Google's certificate on passthrough.

Tab-autocomplete still goes straight to Google. Intercepting IDE traffic may violate the
provider's terms of service, so use it at your own risk.

## Data

| OS | Location |
|---|---|
| Windows | `%APPDATA%\k-spinning` |
| macOS / Linux | `~/.k-spinning` |

Set `DATA_DIR` to use another folder. K-spinning uses its own data folder, autostart entry
and certificate, so it can run next to an upstream 9router install.

## Run from source

```bash
cp .env.example .env      # set INITIAL_PASSWORD, JWT_SECRET, API_KEY_SECRET, MACHINE_ID_SALT
npm install
npm run dev               # http://localhost:699 (DEV_PORT)
```

| Task | Command |
|---|---|
| Production | `npm run build && npm run start` (port `PORT`, default 26015) |
| Build the npm package | `npm run cli:pack` |
| Tests | `cd tests && npm install && npx vitest run` |

Architecture notes are in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and
[`open-sse/AGENTS.md`](./open-sse/AGENTS.md). Changes are listed in
[`CHANGELOG.md`](./CHANGELOG.md).

## Credits

K-spinning is based on **[9Router](https://github.com/decolua/9router)** by decolua and
contributors (v0.5.86), and reuses and modifies its code. Thanks to the 9Router project; its
MIT license and copyright notice are kept in [`NOTICE`](./NOTICE).

## License

[MIT](./LICENSE) © 2026 TienKhang. Portions © 2024-2026 decolua and contributors (9Router),
see [`NOTICE`](./NOTICE).
