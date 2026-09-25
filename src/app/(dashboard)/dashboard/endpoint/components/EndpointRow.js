"use client";

import PropTypes from "prop-types";

/** Reusable modern endpoint row component */
export default function EndpointRow({ label, url, copyId, copied, onCopy, badge, actions }) {
  const isCopied = copied === copyId;
  return (
    <div className="flex items-center gap-2 p-1.5 pl-3 rounded-lg border border-border-subtle bg-surface-2 hover:border-border transition-colors">
      <span
        className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded shrink-0 ${
          badge === "CF" || badge === "TS"
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-surface-3 text-text-muted border border-border"
        }`}
      >
        {label}
      </span>
      <code className="flex-1 font-mono text-[13px] text-text-main select-all overflow-x-auto whitespace-nowrap scrollbar-none px-1">
        {url}
      </code>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onCopy(url, copyId)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isCopied
              ? "bg-emerald-500/15 text-emerald-400"
              : "text-text-muted hover:text-text-main hover:bg-surface-3"
          }`}
          title="Copy URL"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isCopied ? "check" : "content_copy"}
          </span>
          <span className="text-[11px]">{isCopied ? "Copied" : "Copy"}</span>
        </button>
        {actions}
      </div>
    </div>
  );
}

EndpointRow.propTypes = {
  label: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  copyId: PropTypes.string.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  badge: PropTypes.string,
  actions: PropTypes.node,
};
