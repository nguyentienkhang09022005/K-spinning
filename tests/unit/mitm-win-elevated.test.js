import { describe, expect, it } from "vitest";
import { createRequire } from "module";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { buildElevationWrapper, quotePs } = require("../../src/mitm/winElevated.js");

// Runs the UAC wrapper exactly like runElevatedPowerShell does, minus `-Verb RunAs`
// so no real prompt appears. Regression: the wrapper used to go through cmd.exe, which
// cut it at the first newline → "The string is missing the terminator: '".
function runWrapperWithoutUac(innerScript) {
  const wrapper = buildElevationWrapper(innerScript).replace(" -Verb RunAs", "");
  const encoded = Buffer.from(wrapper, "utf16le").toString("base64");
  return new Promise((resolve) => {
    execFile("powershell", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true }, (error, stdout, stderr) => resolve({ error, stderr }));
  });
}

describe.skipIf(process.platform !== "win32")("Windows UAC wrapper", () => {
  it("runs a multi-line inner script with quotes and paths", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-uac-"));
    const out = path.join(dir, "it's ok.txt");
    const inner = `
      $x = "line1"
      [IO.File]::WriteAllText(${quotePs(out)}, "$x-done")
    `;
    const { error } = await runWrapperWithoutUac(inner);
    expect(error).toBeNull();
    expect(fs.readFileSync(out, "utf8")).toBe("line1-done");
  }, 30000);

  it("reports a failing inner script as an error", async () => {
    const { error } = await runWrapperWithoutUac(`exit 3`);
    expect(error).not.toBeNull();
  }, 30000);
});
