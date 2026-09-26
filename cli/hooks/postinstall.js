#!/usr/bin/env node

// Postinstall: warm-up SQLite deps into ~/.k-spinning/runtime so the first
// `k-spinning` start doesn't need network. Failure here is non-fatal —
// cli.js will retry at runtime if anything is missing.
const { ensureSqliteRuntime } = require("./sqliteRuntime");
const { ensureTrayRuntime } = require("./trayRuntime");

try {
  ensureSqliteRuntime({ silent: false });
  console.log("[k-spinning] runtime SQLite deps ready");
} catch (e) {
  console.warn(`[k-spinning] runtime warm-up skipped: ${e.message}`);
}

try {
  ensureTrayRuntime({ silent: false });
} catch (e) {
  console.warn(`[k-spinning] tray runtime skipped: ${e.message}`);
}

process.exit(0);
