# K-spinning

Local AI gateway that **rotates your AI provider accounts** behind one OpenAI-compatible
endpoint. It comes with a web dashboard for accounts, combos (model fallback), quota and
usage tracking.

- One endpoint `http://localhost:26015/v1` for Claude Code, Codex, Cline, OpenCode, Cursor…
- Multi-account rotation and fallback per provider; combos across providers
- OAuth / API-key account management with automatic token refresh
- Antigravity IDE routing through a local MITM (Dashboard → CLI Tools → MITM Tools)

## Install

Requires Node.js 18+ (22+ recommended).

```bash
npm i -g k-spinning
k-spinning
```

Pick **Web UI** in the menu (or open `http://localhost:26015/dashboard`). The first login
password is `123456`; change it right away in Profile.

## Options

```
k-spinning [options]

  -p, --port <port>   Port (default: 26015)
  -H, --host <host>   Bind address (default: 0.0.0.0 — use 127.0.0.1 for local-only)
  -n, --no-browser    Don't open the browser
  -l, --log           Show server logs
  -t, --tray          Run in the system tray (background)
  --skip-update       Skip the update check
  -v, --version       Show version
```

Update: `npm i -g k-spinning@latest`

## Data

Settings, accounts and usage are stored in:

- Windows: `%APPDATA%\k-spinning`
- macOS / Linux: `~/.k-spinning`

Set `DATA_DIR` to use another folder. K-spinning can run next to an upstream 9router install
without sharing data, autostart entries or the MITM certificate.

## License

MIT. K-spinning is based on [9Router](https://github.com/decolua/9router) by decolua and
contributors; see `LICENSE`.
