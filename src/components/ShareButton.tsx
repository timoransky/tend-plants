"use client";

import { useState } from "react";

/** Copy the current household URL — sharing is just copying the link. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); ignore quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-9 items-center gap-1.5 rounded-full bg-canvas-soft px-3 text-sm font-medium text-cream transition-colors hover:bg-canvas-soft/70"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8.5 13.5l7-4M8.5 10.5l7 4M18 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
