import PORTS from "./ports.json" with { type: "json" };

// Default ports live in ports.json (JSON so non-bundled code — the launcher, next.config — can read it too).
// Override via env (.env):
//   PORT      → production server (npm run start)
//   DEV_PORT  → dev server (npm run dev)
// scripts/run-next.mjs exports the port in use as PORT; next.config.mjs forwards it to
// the browser bundle as NEXT_PUBLIC_APP_PORT.
export const DEFAULT_APP_PORT = PORTS.app;
export const DEFAULT_DEV_PORT = PORTS.dev;

export const APP_PORT =
  Number(process.env.NEXT_PUBLIC_APP_PORT || process.env.PORT) || DEFAULT_APP_PORT;

export const LOCAL_APP_URL = `http://localhost:${APP_PORT}`;
export const LOCAL_APP_URL_IP = `http://127.0.0.1:${APP_PORT}`;
