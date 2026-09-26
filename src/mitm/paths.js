// CJS mirror of src/lib/dataDir.js — the MITM server runs as a standalone node process
// and cannot import the ESM app modules. Keep the two resolvers in sync.
const fs = require("fs");
const path = require("path");
const os = require("os");

const APP_NAME = "k-spinning"; // keep in sync with src/lib/dataDir.js
// Own sub-folder so K-spinning never shares the Root CA, PID/lock files or alias cache
// with an upstream 9router install (which uses "<DATA_DIR>/mitm").
const MITM_DIR_NAME = "k-spinning-mitm";

function defaultDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME);
  }
  return path.join(os.homedir(), `.${APP_NAME}`);
}

function getDataDir() {
  const configured = process.env.DATA_DIR;
  if (!configured) return defaultDir();
  if (process.platform === "win32" && /^\//.test(configured)) return defaultDir();
  try {
    fs.mkdirSync(configured, { recursive: true });
    return configured;
  } catch (e) {
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      console.warn(`[DATA_DIR] '${configured}' not writable → fallback ~/.${APP_NAME}`);
      return defaultDir();
    }
    throw e;
  }
}

const DATA_DIR = getDataDir();
const MITM_DIR = path.join(DATA_DIR, MITM_DIR_NAME);
const ALIAS_CACHE_FILE = path.join(MITM_DIR, "aliases.json");

module.exports = { DATA_DIR, MITM_DIR, ALIAS_CACHE_FILE, MITM_DIR_NAME };
