// Single source of the launcher's identity. The published package only ships cli/, so these
// mirror app-side constants — keep them in sync (tests/unit/cli-brand.test.js checks it):
//   DEFAULT_PORT   ↔ src/shared/constants/ports.json "app"
//   DATA_DIR_NAME  ↔ APP_NAME in src/lib/dataDir.js and src/mitm/paths.js
//   MITM_DIR_NAME  ↔ MITM_DIR_NAME in src/mitm/paths.js
const os = require("os");
const path = require("path");

const APP_NAME = "k-spinning";        // npm package + command name
const DISPLAY_NAME = "K-spinning";    // user-facing label
const DATA_DIR_NAME = "k-spinning";   // %APPDATA%\k-spinning, ~/.k-spinning
const MITM_DIR_NAME = "k-spinning-mitm";
const DEFAULT_PORT = 26015;

// Same resolution as the server: DATA_DIR env wins, else the per-OS default.
function getDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  return process.platform === "win32"
    ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), DATA_DIR_NAME)
    : path.join(os.homedir(), `.${DATA_DIR_NAME}`);
}

module.exports = { APP_NAME, DISPLAY_NAME, DATA_DIR_NAME, MITM_DIR_NAME, DEFAULT_PORT, getDataDir };
