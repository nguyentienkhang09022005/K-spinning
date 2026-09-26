import { describe, expect, it } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);

function loadRootCAWithDataDir(dataDir) {
  const rootCAPath = require.resolve("../../src/mitm/cert/rootCA.js");
  const pathsPath = require.resolve("../../src/mitm/paths.js");
  delete require.cache[rootCAPath];
  delete require.cache[pathsPath];

  const oldDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  try {
    return require("../../src/mitm/cert/rootCA.js");
  } finally {
    if (oldDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = oldDataDir;
  }
}

describe("MITM Root CA generation", () => {
  it("creates Root CA files synchronously for direct server startup", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-mitm-ca-"));
    const { generateRootCA } = loadRootCAWithDataDir(dataDir);

    generateRootCA();

    // Own folder, never "<DATA_DIR>/mitm" — that one belongs to an upstream 9router install.
    expect(fs.existsSync(path.join(dataDir, "k-spinning-mitm", "rootCA.key"))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "k-spinning-mitm", "rootCA.crt"))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "mitm"))).toBe(false);
  });

  it("issues a Root CA named for K-spinning so certutil never removes 9router's CA", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-mitm-ca-"));
    const { generateRootCA } = loadRootCAWithDataDir(dataDir);
    generateRootCA();

    const forge = require("node-forge");
    const pem = fs.readFileSync(path.join(dataDir, "k-spinning-mitm", "rootCA.crt"), "utf8");
    const cn = forge.pki.certificateFromPem(pem).subject.getField("CN").value;
    expect(cn).toBe("K-spinning MITM Root CA");
  });
});

// Real TLS handshake (OpenSSL enforces Name Constraints): the Root CA is trusted machine-wide,
// so it must only be able to vouch for the intercepted googleapis.com hosts.
describe("MITM Root CA name constraints", () => {
  async function handshake(rootCA, pem, servername) {
    const tls = await import("tls");
    const leaf = rootCA.generateLeafCert(servername, rootCA.loadRootCA());
    const server = tls.createServer({ key: leaf.key, cert: leaf.cert });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      return await new Promise((resolve) => {
        const sock = tls.connect({ host: "127.0.0.1", port: server.address().port, servername, ca: pem }, () => {
          sock.end(); resolve("ok");
        });
        sock.on("error", (e) => resolve(`${e.code}: ${e.message}`));
      });
    } finally {
      server.close();
    }
  }

  it("accepts intercepted hosts and rejects every other domain", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-mitm-nc-"));
    const rootCA = loadRootCAWithDataDir(dataDir);
    rootCA.generateRootCA();
    const pem = fs.readFileSync(path.join(dataDir, "k-spinning-mitm", "rootCA.crt"), "utf8");

    expect(await handshake(rootCA, pem, "cloudcode-pa.googleapis.com")).toBe("ok");
    expect(await handshake(rootCA, pem, "daily-cloudcode-pa.googleapis.com")).toBe("ok");
    expect(await handshake(rootCA, pem, "accounts.google.com")).toMatch(/permitted subtree violation/);
    expect(await handshake(rootCA, pem, "www.mybank.com")).toMatch(/permitted subtree violation/);
  }, 60000);

  it("replaces an older Root CA that has no name constraints", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kspinning-mitm-nc-"));
    const rootCA = loadRootCAWithDataDir(dataDir);
    const forge = require("node-forge");
    // Simulate a CA issued by the first K-spinning MITM build (no nameConstraints).
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const old = forge.pki.createCertificate();
    old.publicKey = keys.publicKey;
    old.validity.notBefore = new Date();
    old.validity.notAfter = new Date(Date.now() + 5 * 365 * 864e5);
    old.setSubject([{ name: "commonName", value: "K-spinning MITM Root CA" }]);
    old.setIssuer([{ name: "commonName", value: "K-spinning MITM Root CA" }]);
    old.setExtensions([{ name: "basicConstraints", cA: true }]);
    old.sign(keys.privateKey, forge.md.sha256.create());
    const crt = path.join(dataDir, "k-spinning-mitm", "rootCA.crt");
    fs.mkdirSync(path.dirname(crt), { recursive: true });
    fs.writeFileSync(crt, forge.pki.certificateToPem(old));

    expect(rootCA.isCertExpired(crt)).toBe(false);
    expect(rootCA.isCertOutdated(crt)).toBe(true);
  });
});
