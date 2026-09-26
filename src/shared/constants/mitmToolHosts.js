/**
 * Per-tool DNS hosts — written to hosts file as 127.0.0.1 when MITM DNS is enabled.
 * Kept in sync with MITM routing; shared by Node (dnsConfig) and dashboard UI.
 * K-spinning only intercepts Antigravity IDE.
 */
const TOOL_HOSTS = {
  antigravity: ["daily-cloudcode-pa.googleapis.com", "cloudcode-pa.googleapis.com"],
};

module.exports = { TOOL_HOSTS };
