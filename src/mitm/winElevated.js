const { execFile, execSync } = require("child_process");

const IS_WIN = process.platform === "win32";

/**
 * Detect if current Windows process has admin rights (no UAC popup needed).
 * Uses `net session` which only succeeds when elevated.
 */
function isAdmin() {
  if (IS_WIN) {
    try {
      execSync("net session >nul 2>&1", { windowsHide: true, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
  return typeof process.getuid === "function" && process.getuid() === 0;
}

/**
 * Quote a string safely for PowerShell single-quoted literal.
 */
function quotePs(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Run PowerShell script — escalated via UAC popup if not already admin.
 * Returns Promise resolving on exit code 0, rejecting otherwise.
 *
 * IMPORTANT: each call triggers ONE UAC popup. Batch multiple admin tasks
 * into a single script string to minimize popups.
 */
function encodePs(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

// Scripts always travel as -EncodedCommand through execFile (no cmd.exe): cmd truncates a
// multi-line command at the first newline, which broke the UAC wrapper with
// "The string is missing the terminator".
function runPowerShellEncoded(script, callback) {
  return execFile(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodePs(script)],
    { windowsHide: true },
    callback
  );
}

/**
 * Outer script that re-launches `script` elevated via UAC and propagates its exit code.
 * Exported for tests — they run it with `-Verb RunAs` stripped to avoid a real prompt.
 */
function buildElevationWrapper(script) {
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-EncodedCommand", encodePs(script)]
    .map(quotePs).join(",");
  return [
    // Progress records would otherwise reach stderr as CLIXML and bury the real error.
    `$ProgressPreference = 'SilentlyContinue'`,
    `$proc = Start-Process powershell -ArgumentList @(${args}) -Verb RunAs -Wait -PassThru -WindowStyle Hidden`,
    `if ($proc.ExitCode -ne 0) { throw "Elevated command exited with code $($proc.ExitCode)" }`,
  ].join("\n");
}

function runElevatedPowerShell(script) {
  if (!IS_WIN) return Promise.reject(new Error("Windows-only"));

  // If already admin, run directly — zero popup
  if (isAdmin()) {
    return new Promise((resolve, reject) => {
      runPowerShellEncoded(script, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve(stdout);
      });
    });
  }

  // Not admin — wrap with Start-Process -Verb RunAs (UAC popup)
  return new Promise((resolve, reject) => {
    runPowerShellEncoded(
      buildElevationWrapper(script),
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr || error.message;
          if (msg.includes("canceled by the user") || msg.includes("operation was canceled")) {
            reject(new Error("User canceled UAC prompt"));
          } else {
            reject(new Error(msg));
          }
        } else resolve(stdout);
      }
    );
  });
}

module.exports = { isAdmin, runElevatedPowerShell, quotePs, buildElevationWrapper };
