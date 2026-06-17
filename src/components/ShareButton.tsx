"use client";

import { Share08Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
      <HugeiconsIcon icon={Share08Icon} size={15} strokeWidth={1.7} aria-hidden />
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
