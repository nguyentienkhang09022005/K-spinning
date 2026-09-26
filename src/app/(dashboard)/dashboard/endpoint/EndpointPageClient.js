"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Modal, CardSkeleton, Toggle, ConfirmModal } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import EndpointRow from "./components/EndpointRow";
import SecurityWarning from "./components/SecurityWarning";

export default function APIPageClient({ machineId }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [requireApiKey, setRequireApiKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(new Set());
  const [isRemoteHost, setIsRemoteHost] = useState(false);
  const [pingStatus, setPingStatus] = useState("idle");
  const [pingLatency, setPingLatency] = useState(null);
  const [baseUrl, setBaseUrl] = useState("/v1");

  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsRemoteHost(!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname));
      setBaseUrl(`${window.location.origin}/v1`);
    }
  }, []);

  useEffect(() => {
    fetchData();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setRequireApiKey(data.requireApiKey || false);
      }
    } catch (error) {
      console.log("Error loading settings:", error);
    }
  };

  const handleRequireApiKey = async (value) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApiKey: value }),
      });
      if (res.ok) setRequireApiKey(value);
    } catch (error) {
      console.log("Error updating requireApiKey:", error);
    }
  };

  const fetchData = async () => {
    try {
      const fetchKeys = async () => {
        const res = await fetch("/api/keys");
        if (!res.ok) return [];
        const data = await res.json();
        return data.keys || [];
      };

      let existing = await fetchKeys();
      if (existing.length === 0) {
        try {
          const createRes = await fetch("/api/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Default Key" }),
          });
          if (createRes.ok) existing = await fetchKeys();
        } catch {
          // fall through
        }
      }
      setKeys(existing);
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    setPingStatus("testing");
    const start = performance.now();
    try {
      const res = await fetch("/api/settings");
      const elapsed = Math.round(performance.now() - start);
      if (res.ok || res.status === 401) {
        setPingLatency(elapsed);
        setPingStatus("success");
      } else {
        setPingStatus("error");
      }
    } catch {
      setPingStatus("error");
    }
    setTimeout(() => {
      setPingStatus("idle");
    }, 4000);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();

      if (res.ok) {
        setCreatedKey(data.key);
        await fetchData();
        setNewKeyName("");
        setShowAddModal(false);
      }
    } catch (error) {
      console.log("Error creating key:", error);
    }
  };

  const handleDeleteKey = async (id) => {
    setConfirmState({
      title: "Delete API Key",
      message: "Are you sure you want to permanently delete this API key? Applications using this key will immediately lose access.",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
          if (res.ok) {
            setKeys(keys.filter((k) => k.id !== id));
            setVisibleKeys((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        } catch (error) {
          console.log("Error deleting key:", error);
        }
      },
    });
  };

  const handleToggleKey = async (id, isActive) => {
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive } : k)));
      }
    } catch (error) {
      console.log("Error toggling key:", error);
    }
  };

  const maskKey = (fullKey) => {
    if (!fullKey || fullKey.length <= 10) return fullKey || "";
    return fullKey.slice(0, 6) + "•".repeat(Math.min(fullKey.length - 10, 24)) + fullKey.slice(-4);
  };

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Status & Health Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 rounded-xl border border-border-subtle bg-surface w-full">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-text-main">Gateway Active</span>
          </div>
          <span className="text-border-subtle">•</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium text-primary bg-primary/10 border border-primary/20">
            Port 699
          </span>
          <span className="text-border-subtle">•</span>
          <span className="text-xs text-text-muted">OpenAI Compatible (v1)</span>
          <span className="text-border-subtle hidden sm:inline">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            SSE Streaming
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pingStatus === "idle" && (
            <button
              onClick={handlePing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-2 hover:bg-surface-3 text-text-main transition-colors border border-border-subtle"
              title="Test local proxy gateway latency"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">speed</span>
              <span>Test Ping</span>
            </button>
          )}
          {pingStatus === "testing" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
              <span>Testing...</span>
            </span>
          )}
          {pingStatus === "success" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>200 OK ({pingLatency}ms)</span>
            </span>
          )}
          {pingStatus === "error" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              <span className="material-symbols-outlined text-[15px]">error</span>
              <span>Gateway Offline</span>
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Balanced Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full items-start">
        {/* Left Column: API Endpoint Gateway (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <Card className="flex flex-col justify-between h-full">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[17px]">hub</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-text-main leading-tight">API Endpoint</h2>
                    <p className="text-[11px] text-text-muted">Base URL for OpenAI SDKs & CLI tools</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  Ready
                </span>
              </div>

              {/* Endpoint URL Input */}
              <div className="mb-3">
                <EndpointRow
                  label="Local"
                  url={baseUrl}
                  copyId="local_url"
                  copied={copied}
                  onCopy={copy}
                />
              </div>

              {/* Supported Routes */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Supported Routes
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-surface-2/60 border border-border-subtle">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">POST</span>
                      <span className="text-slate-200">/v1/chat/completions</span>
                    </div>
                    <span className="text-[10px] text-text-muted">Chat & Reasoning</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-surface-2/60 border border-border-subtle">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1 py-0.2 rounded">GET</span>
                      <span className="text-slate-200">/v1/models</span>
                    </div>
                    <span className="text-[10px] text-text-muted">Model Catalog</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-surface-2/60 border border-border-subtle">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded">POST</span>
                      <span className="text-slate-200">/v1/embeddings</span>
                    </div>
                    <span className="text-[10px] text-text-muted">Vector Embeddings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer capability badge */}
            <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Compatible with OpenAI SDK & Agents
              </span>
              <span className="text-primary text-[10px] font-medium">SSE Stream Enabled</span>
            </div>
          </Card>
        </div>

        {/* Right Column: API Keys Management (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full" id="require-api-key">
          <Card className="flex flex-col justify-between h-full">
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[17px]">key</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-text-main leading-tight">API Keys</h2>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-2 text-text-muted border border-border-subtle">
                        {keys.length} {keys.length === 1 ? "key" : "keys"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted">Bearer token authentication for client apps</p>
                  </div>
                </div>
                <Button icon="add" onClick={() => setShowAddModal(true)} size="sm">
                  Create Key
                </Button>
              </div>

              {/* Security Setting: Require API Key Authentication */}
              <div className="flex items-center justify-between p-2 px-3 mb-2.5 rounded-lg border border-border-subtle bg-surface-2/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-slate-400">shield</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-text-main">Require API Key Authentication</span>
                      {requireApiKey ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Enforced
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted">
                      {requireApiKey ? "Incoming requests without a Bearer key will be rejected (401)" : "Requests without a Bearer key are allowed"}
                    </p>
                  </div>
                </div>
                <Toggle
                  size="sm"
                  checked={requireApiKey}
                  onChange={() => handleRequireApiKey(!requireApiKey)}
                />
              </div>

              {isRemoteHost && !requireApiKey && (
                <div className="mb-2.5">
                  <SecurityWarning message="Endpoint is exposed remotely without API key authentication." />
                </div>
              )}

              {/* Keys List */}
              {keys.length === 0 ? (
                <div className="text-center py-6 rounded-lg border border-dashed border-border-subtle">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary mb-1.5">
                    <span className="material-symbols-outlined text-[18px]">key</span>
                  </div>
                  <p className="text-xs font-medium text-text-main mb-0.5">No API keys generated</p>
                  <p className="text-[11px] text-text-muted mb-2.5">Create an API key to securely authenticate clients.</p>
                  <Button icon="add" onClick={() => setShowAddModal(true)} size="sm">
                    Create Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {keys.map((key) => {
                    const isVisible = visibleKeys.has(key.id);
                    const isKeyActive = key.isActive !== false;
                    return (
                      <div
                        key={key.id}
                        className={`group flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg border transition-colors ${
                          isKeyActive
                            ? "border-border-subtle bg-surface-2/30 hover:border-border hover:bg-surface-2/60"
                            : "border-border-subtle bg-surface-2/10 opacity-60"
                        }`}
                      >
                        {/* Left: Name, Status, Masked Key */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-100 truncate shrink-0 max-w-[110px]" title={key.name}>
                            {key.name}
                          </span>
                          {isKeyActive ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                              Paused
                            </span>
                          )}

                          {/* Token box */}
                          <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg border border-border-subtle text-slate-200 select-all shrink-0">
                            {isVisible ? key.key : maskKey(key.key)}
                          </code>

                          <button
                            onClick={() => toggleKeyVisibility(key.id)}
                            className="p-0.5 hover:bg-surface-3 rounded text-text-muted hover:text-text-main transition-colors shrink-0"
                            title={isVisible ? "Hide full key" : "Show full key"}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isVisible ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                          <button
                            onClick={() => copy(key.key, key.id)}
                            className="p-0.5 hover:bg-surface-3 rounded text-text-muted hover:text-primary transition-colors shrink-0"
                            title="Copy key"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copied === key.id ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Toggle
                            size="sm"
                            checked={isKeyActive}
                            onChange={(checked) => {
                              if (isKeyActive && !checked) {
                                setConfirmState({
                                  title: "Pause API Key",
                                  message: `Pause API key "${key.name}"?\nRequests using this key will immediately be rejected until resumed.`,
                                  onConfirm: async () => {
                                    setConfirmState(null);
                                    handleToggleKey(key.id, checked);
                                  },
                                });
                              } else {
                                handleToggleKey(key.id, checked);
                              }
                            }}
                            title={isKeyActive ? "Pause key" : "Resume key"}
                          />
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="p-1 hover:bg-rose-500/10 rounded text-text-muted hover:text-rose-400 transition-colors"
                            title="Delete key"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Key Modal */}
      <Modal
        isOpen={showAddModal}
        title="Create API Key"
        onClose={() => {
          setShowAddModal(false);
          setNewKeyName("");
        }}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Key Name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Cursor IDE, Production Web, Test Key"
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleCreateKey} fullWidth disabled={!newKeyName.trim()}>
              Create Key
            </Button>
            <Button
              onClick={() => {
                setShowAddModal(false);
                setNewKeyName("");
              }}
              variant="ghost"
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Created Key Modal */}
      <Modal
        isOpen={!!createdKey}
        title="API Key Created Successfully"
        onClose={() => setCreatedKey(null)}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-xs text-sky-300">
            <p className="font-semibold mb-1">Make sure to copy your API key now!</p>
            <p className="text-slate-400">
              For security, this full key will not be displayed again once this dialog is closed.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={createdKey || ""}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="secondary"
              icon={copied === "created_key" ? "check" : "content_copy"}
              onClick={() => copy(createdKey, "created_key")}
            >
              {copied === "created_key" ? "Copied" : "Copy"}
            </Button>
          </div>
          <Button onClick={() => setCreatedKey(null)} fullWidth>
            Done
          </Button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}

APIPageClient.propTypes = {
  machineId: PropTypes.string.isRequired,
};
