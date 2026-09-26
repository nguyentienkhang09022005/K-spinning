// CJS reader for MITM standalone process. Reads mitmAlias from JSON cache
// at <MITM_DIR>/aliases.json (synced by app from SQLite on startup + writes).
// JSON-only: no SQLite native binding required in MITM bundle.
const fs = require("fs");
const { ALIAS_CACHE_FILE } = require("./paths");

function readCache() {
  try {
    if (!fs.existsSync(ALIAS_CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(ALIAS_CACHE_FILE, "utf-8"));
  } catch { return null; }
}

function getMitmAlias(toolName) {
  const all = readCache();
  return all?.[toolName] || null;
}

module.exports = { getMitmAlias };
