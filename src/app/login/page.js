"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/shared/components";
import { APP_CONFIG } from "@/shared/constants/config";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetHint, setResetHint] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Countdown for rate-limit
  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = setInterval(() => setRetryAfter((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  useEffect(() => {
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/auth/status`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated === true || data.requireLogin === false) {
            window.location.assign("/dashboard");
            return;
          }
          setHasPassword(!!data.hasPassword);
        } else {
          setHasPassword(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!password || retryAfter > 0) return;

    setLoading(true);
    setError("");
    setResetHint("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mustChangePassword) {
          setMustChange(true);
          return;
        }
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
        if (data.resetHint) {
          // Clean 9router reference to k-spinning
          setResetHint(data.resetHint.replace(/9router/gi, "k-spinning"));
        }
        if (data.retryAfter) setRetryAfter(Number(data.retryAfter));
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });
      if (res.ok) {
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to set password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefault = () => {
    setPassword("123456");
    setError("");
  };

  // Loading state
  if (hasPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-medium text-text-muted">Connecting to K-spinning Gateway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 sm:p-6 md:p-8 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.05] rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[440px] sm:max-w-[500px] md:max-w-[540px]">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-surface-2/80 border border-border-subtle shadow-xl mb-4 backdrop-blur-sm">
            <Image
              src="/logo.png"
              alt="K-spinning Logo"
              width={54}
              height={54}
              priority
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>

          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-100">
              {APP_CONFIG.name}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              v{APP_CONFIG.version}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Enter your master password to access the gateway dashboard
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border-subtle bg-surface/90 backdrop-blur-xl p-6 sm:p-8 md:p-9 shadow-2xl shadow-black/50">
          {mustChange ? (
            <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4 sm:gap-5">
              <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-400">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-amber-400 shrink-0">shield</span>
                  <p>A new password is required before accessing the dashboard remotely.</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-200">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-muted">
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">lock_reset</span>
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new master password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-11 pr-11 py-3 sm:py-3.5 text-sm sm:text-base text-text-main bg-surface-2 rounded-xl border border-border-subtle focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/25 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-text-main transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                      {showNewPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs sm:text-sm text-red-400">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <p className="flex-1">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2 py-3 sm:py-3.5 text-sm sm:text-base"
                loading={loading}
                disabled={!newPassword}
              >
                Set New Password & Enter
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4 sm:gap-5">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">Master Password</label>
                  <button
                    type="button"
                    onClick={handleFillDefault}
                    className="text-xs sm:text-sm font-mono text-primary hover:text-primary-hover hover:underline transition-colors"
                    title="Fill default password"
                  >
                    Default: 123456
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-muted">
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">lock</span>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    disabled={retryAfter > 0}
                    className="w-full pl-11 pr-11 py-3 sm:py-3.5 text-sm sm:text-base text-text-main bg-surface-2 rounded-xl border border-border-subtle focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/25 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-text-main transition-colors"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error feedback */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs sm:text-sm text-red-400">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <p className="flex-1">{error}</p>
                </div>
              )}

              {/* Rate limit warning */}
              {retryAfter > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs sm:text-sm text-amber-400">
                  <span className="material-symbols-outlined text-[18px] shrink-0">timer</span>
                  <p className="flex-1">
                    Too many attempts. Locked for <span className="font-mono font-bold">{retryAfter}s</span>.
                  </p>
                </div>
              )}

              {/* Reset hint */}
              {resetHint && (
                <div className="p-3 rounded-lg bg-surface-2 border border-border-subtle text-xs text-text-muted">
                  <p className="leading-relaxed">
                    Forgot password? Open <code className="bg-surface-3 px-1.5 py-0.5 rounded text-slate-200 font-mono">k-spinning</code> CLI on host → <b>Settings</b> → <b>Reset Password</b>.
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={retryAfter > 0 || loading || !password}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-sm sm:text-base font-semibold bg-primary text-black hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-1 sm:mt-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Authenticating...</span>
                  </>
                ) : retryAfter > 0 ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                    <span>Wait {retryAfter}s</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Enter Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center flex items-center justify-center gap-3 text-xs sm:text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Port 699 Gateway
          </span>
          <span>•</span>
          <span>End-to-end Local Session</span>
        </div>
      </div>
    </div>
  );
}
