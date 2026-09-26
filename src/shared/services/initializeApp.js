import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { cleanupProviderConnections, getSettings, updateSettings, getApiKeys } from "@/lib/localDb";
import { killAllBridges } from "@/lib/mcp/stdioSseBridge";
import { getMitmStatus, startMitm, loadEncryptedPassword, initDbHooks, restoreToolDNS, removeOwnedDNSEntriesSync } from "@/mitm/manager";
import { syncToJson as syncMitmAliasCache } from "@/lib/mitmAliasCache";

// Inject correct paths and DB hooks into manager.js (CJS) from ESM context
(function bootstrapMitm() {
  if (!process.env.MITM_SERVER_PATH) {
    try {
      const thisFile = fileURLToPath(import.meta.url);
      const appSrc = dirname(dirname(thisFile));
      const candidate = join(appSrc, "mitm", "server.js");
      if (existsSync(candidate)) process.env.MITM_SERVER_PATH = candidate;
    } catch { /* ignore */ }
  }
  try { initDbHooks(getSettings, updateSettings); } catch { /* ignore */ }
})();

process.setMaxListeners(20);

// Defer heavy startup work so the first HTTP request (login → dashboard) isn't
// starved by DB cleanup and OAuth pings.
const STARTUP_DEFER_MS = 3000;

// Survive Next.js hot reload
const g = global.__appSingleton ??= {
  signalHandlersRegistered: false,
  mitmStartInProgress: false,
};

export async function initializeApp() {
  try {
    if (!g.signalHandlersRegistered) {
      const cleanup = () => {
        // Hosts entries must not outlive the app, or Antigravity loses its backend.
        try { removeOwnedDNSEntriesSync(); } catch { /* best effort */ }
        try { killAllBridges(); } catch { /* best effort */ }
        process.exit();
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
      process.on("exit", () => { try { removeOwnedDNSEntriesSync(); } catch { /* ignore */ } });
      g.signalHandlersRegistered = true;
    }

    // Defer the heavy work — nothing here blocks incoming requests.
    setTimeout(() => {
      runHeavyStartup().catch((e) => console.error("[InitApp] deferred startup failed:", e.message));
    }, STARTUP_DEFER_MS);
  } catch (error) {
    console.error("[InitApp] Error:", error);
  }
}

async function runHeavyStartup() {
  await cleanupProviderConnections();
  const settings = await getSettings();

  if (settings.mitmEnabled) {
    // Sync mitmAlias DB → JSON cache so standalone MITM server can read it.
    syncMitmAliasCache().catch(() => {});
    autoStartMitm(settings);
  }

  if (hasQuotaAutoPingEnabled(settings)) {
    import("@/shared/services/quotaAutoPing")
      .then(({ startQuotaAutoPing }) => startQuotaAutoPing())
      .catch((e) => console.log("[AutoPing] scheduler start failed:", e.message));
  }

  // Proactive OAuth token refresh (e.g. grok-cli ~6h TTL). Module is idempotent
  // and also started from custom-server.js when that entry is used.
  import("@/sse/services/backgroundTokenRefresh.js")
    .then(({ startBackgroundTokenRefresh }) => startBackgroundTokenRefresh())
    .catch((e) => console.log("[BackgroundTokenRefresh] scheduler start failed:", e.message));
}

async function autoStartMitm(settings) {
  if (g.mitmStartInProgress) return;
  g.mitmStartInProgress = true;
  try {
    const mitmStatus = await getMitmStatus();
    if (mitmStatus.running) return;

    const password = await loadEncryptedPassword();
    if (!password && process.platform !== "win32") {
      console.log("[InitApp] MITM was enabled but no saved password found, skipping auto-start");
      return;
    }

    const keys = await getApiKeys();
    const activeKey = keys.find(k => k.isActive !== false);
    if (!activeKey?.key) {
      console.log("[InitApp] MITM was enabled but no active API key exists, skipping auto-start");
      return;
    }

    console.log("[InitApp] MITM was enabled, auto-starting...");
    await startMitm(activeKey.key, password);
    console.log("[InitApp] MITM auto-started");
    try {
      await restoreToolDNS(password);
      console.log("[InitApp] DNS restored from saved state");
    } catch (e) {
      console.log("[InitApp] DNS restore failed:", e.message);
    }
  } catch (err) {
    console.log("[InitApp] MITM auto-start failed:", err.message);
  } finally {
    g.mitmStartInProgress = false;
  }
}

function hasQuotaAutoPingEnabled(settings) {
  return [settings?.claudeAutoPing, settings?.codexAutoPing]
    .some((config) => Object.values(config?.connections || {}).some(Boolean));
}

export default initializeApp;
