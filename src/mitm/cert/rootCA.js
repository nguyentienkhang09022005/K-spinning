const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const forge = require("node-forge");
const { MITM_DIR } = require("../paths");

const ROOT_CA_KEY_PATH = path.join(MITM_DIR, "rootCA.key");
const ROOT_CA_CERT_PATH = path.join(MITM_DIR, "rootCA.crt");

// The Root CA is trusted machine-wide, so a leaked key would let anyone impersonate ANY
// HTTPS site. Name Constraints limit what it may sign to the intercepted hosts' domain —
// Windows CryptoAPI, OpenSSL and Go reject leaf certs outside it. Covers every host in
// shared/constants/mitmToolHosts.js; widen only together with that list.
const PERMITTED_DNS_DOMAINS = ["googleapis.com"];
const NAME_CONSTRAINTS_OID = "2.5.29.30";

// forge has no builder for nameConstraints — encode the DER by hand:
// NameConstraints ::= SEQUENCE { permittedSubtrees [0] SEQUENCE OF GeneralSubtree }
// GeneralSubtree  ::= SEQUENCE { base GeneralName }   — dNSName is [2] IA5String
function buildNameConstraintsExtension(domains) {
  const { asn1 } = forge;
  const subtrees = domains.map((d) =>
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, false, d),
    ])
  );
  const value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, subtrees),
  ]);
  return { id: NAME_CONSTRAINTS_OID, critical: true, value: asn1.toDer(value).getBytes() };
}

function hasNameConstraints(cert) {
  return (cert.extensions || []).some((e) => e.id === NAME_CONSTRAINTS_OID);
}

// Private key readable by the current user only (the MITM child runs as that user).
function restrictKeyFile(filePath) {
  if (process.platform !== "win32") {
    try { fs.chmodSync(filePath, 0o600); } catch { /* best effort */ }
    return;
  }
  const user = process.env.USERDOMAIN ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}` : process.env.USERNAME;
  if (!user) return;
  try {
    execFileSync("icacls", [filePath, "/inheritance:r", "/grant:r", `${user}:F`], { windowsHide: true, stdio: "ignore" });
  } catch (e) {
    console.warn(`[MITM] Could not restrict permissions on ${filePath}: ${e.message}`);
  }
}

/**
 * Check if cert file is expired or expiring within 30 days
 */
function isCertExpired(certPath) {
  try {
    const cert = forge.pki.certificateFromPem(fs.readFileSync(certPath, "utf8"));
    const expiryThreshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return cert.validity.notAfter < expiryThreshold;
  } catch {
    return true; // treat unreadable cert as expired
  }
}

/**
 * Expired, or issued before Name Constraints were added (unconstrained CAs must be replaced).
 */
function isCertOutdated(certPath) {
  if (isCertExpired(certPath)) return true;
  try {
    return !hasNameConstraints(forge.pki.certificateFromPem(fs.readFileSync(certPath, "utf8")));
  } catch {
    return true;
  }
}

/**
 * Generate Root CA certificate (only once, auto-regenerate if expired)
 * This Root CA will sign all dynamic leaf certificates
 */
function generateRootCA() {
  const exists = fs.existsSync(ROOT_CA_KEY_PATH) && fs.existsSync(ROOT_CA_CERT_PATH);
  if (exists && !isCertOutdated(ROOT_CA_CERT_PATH)) {
    console.log("✅ Root CA already exists");
    return { key: ROOT_CA_KEY_PATH, cert: ROOT_CA_CERT_PATH };
  }
  if (exists) {
    console.log("🔐 Root CA expired or lacks Name Constraints — regenerating...");
    try { fs.unlinkSync(ROOT_CA_KEY_PATH); } catch { /* ignore */ }
    try { fs.unlinkSync(ROOT_CA_CERT_PATH); } catch { /* ignore */ }
  }

  if (!fs.existsSync(MITM_DIR)) {
    fs.mkdirSync(MITM_DIR, { recursive: true });
  }

  console.log("🔐 Generating Root CA certificate...");

  // Generate RSA key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Create Root CA certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: "commonName", value: "K-spinning MITM Root CA" },
    { name: "organizationName", value: "K-spinning" },
    { name: "countryName", value: "US" }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs); // Self-signed

  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
      critical: true
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      cRLSign: true,
      critical: true
    },
    {
      name: "subjectKeyIdentifier"
    },
    buildNameConstraintsExtension(PERMITTED_DNS_DOMAINS)
  ]);

  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Save to disk
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certPem = forge.pki.certificateToPem(cert);

  fs.writeFileSync(ROOT_CA_KEY_PATH, privateKeyPem, { mode: 0o600 });
  restrictKeyFile(ROOT_CA_KEY_PATH);
  fs.writeFileSync(ROOT_CA_CERT_PATH, certPem);

  console.log("✅ Root CA generated successfully");
  return { key: ROOT_CA_KEY_PATH, cert: ROOT_CA_CERT_PATH };
}

/**
 * Load Root CA from disk
 */
function loadRootCA() {
  if (!fs.existsSync(ROOT_CA_KEY_PATH) || !fs.existsSync(ROOT_CA_CERT_PATH)) {
    throw new Error("Root CA not found. Generate it first.");
  }

  const keyPem = fs.readFileSync(ROOT_CA_KEY_PATH, "utf8");
  const certPem = fs.readFileSync(ROOT_CA_CERT_PATH, "utf8");

  return {
    key: forge.pki.privateKeyFromPem(keyPem),
    cert: forge.pki.certificateFromPem(certPem)
  };
}

/**
 * Generate leaf certificate for a specific domain, signed by Root CA
 */
function generateLeafCert(domain, rootCA) {
  // Generate key pair for leaf cert
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Create leaf certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Math.floor(Math.random() * 1000000).toString();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  cert.setSubject([
    { name: "commonName", value: domain }
  ]);

  cert.setIssuer(rootCA.cert.subject.attributes);

  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: false
    },
    {
      name: "keyUsage",
      digitalSignature: true,
      keyEncipherment: true
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
      clientAuth: true
    },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: domain }, // DNS
        { type: 2, value: `*.${domain}` } // Wildcard
      ]
    }
  ]);

  // Sign with Root CA
  cert.sign(rootCA.key, forge.md.sha256.create());

  return {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert)
  };
}

module.exports = {
  generateRootCA,
  loadRootCA,
  generateLeafCert,
  isCertExpired,
  isCertOutdated,
  PERMITTED_DNS_DOMAINS,
  ROOT_CA_CERT_PATH,
  ROOT_CA_KEY_PATH
};
