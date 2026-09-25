"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";

const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt", "systemone"];
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/dashboard/media-providers/web" };

// Refined, intuitive iconography:
// - key: Endpoint & API Key authentication
// - smart_toy: AI Model Providers
// - alt_route: Combo & Vision multi-route adapters
// - analytics: Usage tracking & metrics
// - speed: Quota limits & rate tracker
// - compress: Token Saver compression
// - terminal: CLI execution tools
const navItems = [
  { href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "key" },
  { href: "/dashboard/providers", label: "Providers", icon: "smart_toy" },
  { href: "/dashboard/combos", label: "Combo & Vision Adapter", icon: "alt_route" },
  { href: "/dashboard/usage", label: "Usage Analytics", icon: "analytics" },
  { href: "/dashboard/quota", label: "Quota Tracker", icon: "speed" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "compress" },
  { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
];

// - router: Proxy network pools
const systemItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "router" },
];

// - receipt_long: Log records (distinct from CLI terminal)
// - translate: Translation format debugger
const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "receipt_long" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [enableTranslator, setEnableTranslator] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.enableTranslator) setEnableTranslator(true);
      })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border-subtle bg-sidebar transition-colors duration-200 min-h-full select-none">
      {/* Brand Header */}
      <div className="px-4 pt-4 pb-2.5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.04]"
        >
          <Image
            src="/logo.png"
            alt="K-spinning"
            width={34}
            height={34}
            priority
            className="h-7 w-auto shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-slate-100 tracking-tight truncate">
                {APP_CONFIG.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-mono">v{APP_CONFIG.version}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto custom-scrollbar">
        {/* Core Section */}
        <div>
          <div className="px-3 pb-1 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Services
          </div>

          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group",
                    active
                      ? "bg-sky-500/10 text-sky-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px] transition-colors shrink-0",
                      active
                        ? "fill-1 text-sky-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Section */}
        <div>
          <div className="px-3 pb-1 text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            System
          </div>

          <div className="space-y-0.5">
            {/* Media Providers Accordion */}
            <button
              onClick={() => setMediaOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group",
                pathname.startsWith("/dashboard/media-providers")
                  ? "bg-sky-500/10 text-sky-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px] transition-colors shrink-0",
                  pathname.startsWith("/dashboard/media-providers")
                    ? "fill-1 text-sky-400"
                    : "text-slate-400 group-hover:text-slate-200"
                )}
              >
                perm_media
              </span>
              <span className="flex-1 text-left truncate">Media Providers</span>
              {MEDIA_PROVIDER_KINDS.some((k) => VISIBLE_MEDIA_KINDS.includes(k.id) && k.isNew) && (
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                  NEW
                </span>
              )}
              <span
                className="material-symbols-outlined text-[15px] transition-transform duration-200 text-slate-400 shrink-0"
                style={{ transform: mediaOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                expand_more
              </span>
            </button>

            {/* Sub-items for Media */}
            {mediaOpen && (
              <div className="ml-3 pl-3 border-l border-white/[0.06] space-y-0.5 my-1">
                {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => {
                  const subActive = pathname.startsWith(`/dashboard/media-providers/${kind.id}`);
                  return (
                    <Link
                      key={kind.id}
                      href={`/dashboard/media-providers/${kind.id}`}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        subActive
                          ? "bg-sky-500/10 text-sky-400"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px] shrink-0">{kind.icon}</span>
                      <span className="truncate">{kind.label}</span>
                      {kind.isNew && (
                        <span className="ml-auto text-[9px] font-medium px-1 rounded bg-emerald-500/15 text-emerald-400">
                          NEW
                        </span>
                      )}
                    </Link>
                  );
                })}
                <Link
                  key={COMBINED_WEB_ITEM.id}
                  href={COMBINED_WEB_ITEM.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    pathname.startsWith(COMBINED_WEB_ITEM.href)
                      ? "bg-sky-500/10 text-sky-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0">{COMBINED_WEB_ITEM.icon}</span>
                  <span className="truncate">{COMBINED_WEB_ITEM.label}</span>
                </Link>
              </div>
            )}

            {/* Proxy Pools */}
            {systemItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group",
                    active
                      ? "bg-sky-500/10 text-sky-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px] transition-colors shrink-0",
                      active
                        ? "fill-1 text-sky-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* Debug items */}
            {debugItems.map((item) => {
              const show = item.href !== "/dashboard/translator" || enableTranslator;
              if (!show) return null;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group",
                    active
                      ? "bg-sky-500/10 text-sky-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px] transition-colors shrink-0",
                      active
                        ? "fill-1 text-sky-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* Settings */}
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group",
                isActive("/dashboard/profile")
                  ? "bg-sky-500/10 text-sky-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[18px] transition-colors shrink-0",
                  isActive("/dashboard/profile")
                    ? "fill-1 text-sky-400"
                    : "text-slate-400 group-hover:text-slate-200"
                )}
              >
                settings
              </span>
              <span className="truncate">Settings</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Understated Minimal Bottom Bar */}
      <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[11px] text-slate-300">port 699</span>
        </div>
        <span className="text-[11px] text-slate-500">Localhost</span>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};
