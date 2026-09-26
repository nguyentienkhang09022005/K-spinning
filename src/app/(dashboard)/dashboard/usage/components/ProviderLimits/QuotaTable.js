"use client";

import { useEffect, useMemo, useState } from "react";
import { formatResetTime, getRemainingPercentage } from "./utils";

const PAGE_SIZE = 10;

/**
 * Format reset time display (Today, 12:00 PM)
 */
function formatResetTimeDisplay(resetTime) {
  if (!resetTime) return null;

  try {
    const date = new Date(resetTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dayStr = "";
    if (date >= today && date < tomorrow) {
      dayStr = "Today";
    } else if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
      dayStr = "Tomorrow";
    } else {
      dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${dayStr}, ${timeStr}`;
  } catch {
    return null;
  }
}

/**
 * Get clear, sharp, high-contrast status styling
 */
function getQuotaStatus(remainingPercentage) {
  if (remainingPercentage > 60) {
    return {
      dot: "bg-emerald-400",
      bar: "bg-emerald-500",
      percentText: "text-emerald-400",
    };
  }

  if (remainingPercentage >= 20) {
    return {
      dot: "bg-amber-400",
      bar: "bg-amber-400",
      percentText: "text-amber-400",
    };
  }

  // < 20%
  return {
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    percentText: "text-rose-400",
  };
}

function sortQuotas(quotas, sortMode) {
  if (sortMode === "remaining-asc") {
    return [...quotas].sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name));
  }

  if (sortMode === "remaining-desc") {
    return [...quotas].sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
  }

  return quotas;
}

/**
 * Quota Table Component - Sharp, high-contrast layout with full-width progress bars
 */
export default function QuotaTable({
  quotas = [],
  compact = false,
  sortMode = "default",
  showSortLabel = false,
  onHideQuota = null,
}) {
  const [page, setPage] = useState(1);

  const normalizedQuotas = useMemo(
    () =>
      quotas.map((quota, index) => ({
        ...quota,
        index,
        remaining: getRemainingPercentage(quota),
      })),
    [quotas]
  );

  const sortedQuotas = useMemo(
    () => sortQuotas(normalizedQuotas, sortMode),
    [normalizedQuotas, sortMode]
  );

  const totalPages = Math.max(1, Math.ceil(sortedQuotas.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [sortMode, quotas]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  if (!quotas || quotas.length === 0) {
    return null;
  }

  const currentPageRows = sortedQuotas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageStart = sortedQuotas.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, sortedQuotas.length);

  const sortLabel = "Sorted by remaining";
  const hasHideAction = typeof onHideQuota === "function";

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 text-xs text-text-muted">
        <span className="font-medium text-slate-300">
          {sortedQuotas.length} {sortedQuotas.length > 1 ? "quotas" : "quota"}
        </span>
        {showSortLabel && (
          <span className="rounded px-2 py-0.5 text-[11px] text-slate-300 bg-surface-2 border border-border-subtle">
            {sortLabel}
          </span>
        )}
      </div>

      {/* Quota Items List */}
      <div className="space-y-1.5">
        {currentPageRows.map((quota) => {
          const isUnlimited = quota.unlimited === true;
          const isCreditBalance = quota.isCreditBalance === true;
          const status = isCreditBalance
            ? { dot: "bg-sky-400", bar: "bg-sky-500", percentText: "text-sky-400" }
            : getQuotaStatus(quota.remaining);
          const countdown = formatResetTime(quota.resetAt);
          const resetDisplay = formatResetTimeDisplay(quota.resetAt);
          const recurring = quota.recurring !== false;
          const countdownLabel = recurring ? `in ${countdown}` : `exp ${countdown}`;

          return (
            <div
              key={`${quota.name}-${quota.index}`}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-2/30 hover:bg-surface-2/60 transition-all text-xs"
            >
              {/* Left: Dot & Quota Name */}
              <div className="flex items-center gap-1.5 shrink-0 w-28 sm:w-32 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                <span className="font-semibold text-xs text-slate-100 truncate" title={quota.name}>
                  {quota.name}
                </span>
              </div>

              {/* Middle: Long flexible progress bar */}
              {!isUnlimited && !isCreditBalance ? (
                <div className="flex-1 min-w-[90px] h-2 rounded-full bg-slate-800/80 border border-slate-700/60 overflow-hidden shrink">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${status.bar}`}
                    style={{ width: `${Math.min(quota.remaining, 100)}%` }}
                  />
                </div>
              ) : (
                <div className="flex-1 min-w-[90px] text-[11px] text-slate-400 font-mono">
                  {isUnlimited ? "Unlimited" : `Credit: ${quota.total.toFixed(2)} ${quota.currency || ""}`}
                </div>
              )}

              {/* Right: Usage count */}
              {!isUnlimited && !isCreditBalance && (
                <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                  <span className="text-slate-100 font-semibold">{quota.used.toLocaleString()}</span> / {quota.total > 0 ? quota.total.toLocaleString() : "∞"}
                </span>
              )}

              {/* Right: Percentage */}
              {!isUnlimited && !isCreditBalance && (
                <span className={`font-mono text-xs font-bold shrink-0 w-9 text-right tabular-nums ${status.percentText}`}>
                  {quota.remaining}%
                </span>
              )}

              {/* Right: Countdown pill */}
              {(countdown !== "-" || resetDisplay) && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-surface-3 border border-border-subtle shrink-0"
                  title={resetDisplay || ""}
                >
                  {countdown !== "-" ? countdownLabel : resetDisplay}
                </span>
              )}

              {/* Right: Hide action (hover) */}
              {hasHideAction && (
                <button
                  type="button"
                  onClick={() => onHideQuota(quota)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-100 hover:bg-surface-3 shrink-0"
                  title="Hide this quota"
                  aria-label={`Hide quota ${quota.name}`}
                >
                  <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-1 text-xs text-text-muted">
          <span className="text-slate-400 font-mono">
            {pageStart}-{pageEnd} of {sortedQuotas.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-md border border-border-subtle bg-surface-2 text-slate-200 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Prev
            </button>
            <span className="px-1.5 font-mono text-slate-300 text-xs">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded-md border border-border-subtle bg-surface-2 text-slate-200 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

QuotaTable.propTypes = {};
