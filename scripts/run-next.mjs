/**
 * Launch Next with the port taken from env instead of a hardcoded --port flag.
 *   node scripts/run-next.mjs dev [...nextArgs]    → DEV_PORT (fallback ports.json "dev")
 *   node scripts/run-next.mjs start [...args]      → PORT     (fallback ports.json "app")
 *
 * Next reads .env only after the HTTP server is bound, so PORT/DEV_PORT in .env would
 * otherwise be ignored. We load .env here (real env vars still win) and export the chosen
 * port as PORT so server code building local URLs sees the port actually in use.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORTS = JSON.parse(readFileSync(new URL("../src/shared/constants/ports.json", import.meta.url), "utf8"));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const [mode, ...extraArgs] = process.argv.slice(2);
if (mode !== "dev" && mode !== "start") {
  console.error("Usage: node scripts/run-next.mjs <dev|start> [...args]");
  process.exit(1);
}

loadDotEnv(join(ROOT, ".env"));

const raw = mode === "dev" ? process.env.DEV_PORT : process.env.PORT;
const port = parseInt(raw, 10) || (mode === "dev" ? PORTS.dev : PORTS.app);
process.env.PORT = String(port);

const args = mode === "dev"
  ? [require.resolve("next/dist/bin/next"), "dev", "--port", String(port), ...extraArgs]
  : [join(ROOT, "custom-server.js"), "--port", String(port), ...extraArgs];

const child = spawn(process.execPath, args, { cwd: ROOT, stdio: "inherit", env: process.env });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
