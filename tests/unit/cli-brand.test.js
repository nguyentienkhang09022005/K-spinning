import { describe, expect, it } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const BRAND = require("../../cli/src/cli/brand.js");
const PORTS = require("../../src/shared/constants/ports.json");
const cliPkg = require("../../cli/package.json");

// The published package only ships cli/, so brand.js mirrors app constants by value.
describe("CLI brand stays in sync with the app", () => {
  it("package name and command are k-spinning", () => {
    expect(cliPkg.name).toBe(BRAND.APP_NAME);
    expect(Object.keys(cliPkg.bin)).toEqual([BRAND.APP_NAME]);
  });

  it("default port matches src/shared/constants/ports.json", () => {
    expect(BRAND.DEFAULT_PORT).toBe(PORTS.app);
  });

  it("data dir name matches the server and MITM resolvers", () => {
    expect(read("src/lib/dataDir.js")).toContain(`const APP_NAME = "${BRAND.DATA_DIR_NAME}";`);
    expect(read("src/mitm/paths.js")).toContain(`const APP_NAME = "${BRAND.DATA_DIR_NAME}";`);
    expect(read("src/mitm/paths.js")).toContain(`const MITM_DIR_NAME = "${BRAND.MITM_DIR_NAME}";`);
  });

  it("honours DATA_DIR, else uses a k-spinning folder", () => {
    const saved = process.env.DATA_DIR;
    try {
      process.env.DATA_DIR = "X:/custom";
      expect(BRAND.getDataDir()).toBe("X:/custom");
      delete process.env.DATA_DIR;
      expect(path.basename(BRAND.getDataDir()).replace(/^\./, "")).toBe("k-spinning");
    } finally {
      if (saved === undefined) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = saved;
    }
  });

  it("never kills processes it does not own (no next-server / 9router name matching)", () => {
    const cli = read("cli/cli.js");
    expect(cli).not.toMatch(/includes\("next-server"\)/);
    expect(cli).not.toMatch(/includes\("9router"\)/);
    expect(cli).toContain("isOwnAppProcess");
  });

  it("autostart entries are distinct from upstream 9router", () => {
    const autostart = read("cli/src/cli/tray/autostart.js");
    expect(autostart).toContain(`const APP_NAME = "k-spinning";`);
    expect(autostart).toContain(`const APP_LABEL = "com.k-spinning.autostart";`);
  });
});
