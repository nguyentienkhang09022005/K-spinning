import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { MITM_TOOLS } from "../../src/shared/constants/cliTools.js";

const require = createRequire(import.meta.url);
const { TOOL_HOSTS } = require("../../src/shared/constants/mitmToolHosts.js");
const { CATCH_ALL_ALIAS, TARGET_HOSTS, getToolForHost } = require("../../src/mitm/config.js");

function freshRequire(modPath, env) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}src${path.sep}mitm${path.sep}`)) delete require.cache[key];
  }
  try {
    return require(modPath);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("K-spinning MITM scope", () => {
  it("only redirects Antigravity hosts", () => {
    expect(Object.keys(TOOL_HOSTS)).toEqual(["antigravity"]);
    expect(TARGET_HOSTS).toEqual(TOOL_HOSTS.antigravity);
    expect(getToolForHost("cloudcode-pa.googleapis.com:443")).toBe("antigravity");
    expect(getToolForHost("api.individual.githubcopilot.com")).toBeNull();
  });

  it("offers a catch-all mapping row so unmapped models never use the IDE account", () => {
    const rows = MITM_TOOLS.antigravity.defaultModels;
    expect(rows[0].alias).toBe(CATCH_ALL_ALIAS);
    expect(Object.keys(MITM_TOOLS)).toEqual(["antigravity"]);
  });
});

describe("K-spinning MITM paths and router target", () => {
  const dirs = [];
  afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

  it("keeps MITM state under <DATA_DIR>/k-spinning-mitm", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-paths-"));
    dirs.push(dataDir);
    const { MITM_DIR, ALIAS_CACHE_FILE } = freshRequire("../../src/mitm/paths.js", { DATA_DIR: dataDir });
    expect(MITM_DIR).toBe(path.join(dataDir, "k-spinning-mitm"));
    expect(ALIAS_CACHE_FILE).toBe(path.join(dataDir, "k-spinning-mitm", "aliases.json"));
  });

  it("targets the port this instance runs on, not upstream's 20128", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-port-"));
    dirs.push(dataDir);
    const { DEFAULT_MITM_ROUTER_BASE } = freshRequire("../../src/mitm/manager.js", { DATA_DIR: dataDir, PORT: "699" });
    expect(DEFAULT_MITM_ROUTER_BASE).toBe("http://localhost:699");
  });
});
