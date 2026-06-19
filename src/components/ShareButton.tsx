"use client";

import {
  Copy01Icon,
  Share08Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, useSyncExternalStore } from "react";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";

// These reads never change after mount, so the store never emits.
const noopSubscribe = () => () => {};

/** Sharing a household is just sharing its link — the URL token is the access key. */
export function ShareButton({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // window/navigator are client-only. useSyncExternalStore renders the server
  // snapshot ("" / false) during hydration, then the real value — no mismatch.
  const shareUrl = useSyncExternalStore(
    noopSubscribe,
    () => `${window.location.origin}/h/${token}`,
    () => "",
  );
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); ignore quietly.
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "Tend",
        text: "Help me tend these plants on Tend",
        url: shareUrl || window.location.href,
      });
    } catch (err) {
      // The user dismissing the OS share sheet throws AbortError — ignore it;
      // anything else, fall back to copying the link.
      if ((err as Error)?.name !== "AbortError") void copy();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share this garden"
        className="flex size-9 items-center justify-center rounded-full bg-canvas-soft text-cream transition-colors hover:bg-canvas-soft/70"
      >
        <HugeiconsIcon icon={Share08Icon} size={17} strokeWidth={1.7} aria-hidden />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <header className="flex items-center gap-4 pb-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink">
            <HugeiconsIcon icon={Share08Icon} size={26} strokeWidth={1.7} aria-hidden />
          </span>
          <div className="min-w-0">
            <DrawerTitle className="text-2xl font-semibold tracking-tight text-ink">
              Share this garden
            </DrawerTitle>
            <DrawerDescription className="text-sm text-ink-soft">
              Anyone with this link can view and update the same plants — there&rsquo;s
              no login. Send it to whoever you share these plants with.
            </DrawerDescription>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Shareable link"
            className="no-ios-zoom w-full truncate rounded-xl bg-surface-muted px-3.5 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
          />

          <button
            type="button"
            onClick={copy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-healthy text-base font-semibold text-canvas transition-colors hover:bg-healthy/90"
          >
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              size={18}
              strokeWidth={2}
              aria-hidden
            />
            {copied ? "Copied!" : "Copy link"}
          </button>

          {canShare ? (
            <button
              type="button"
              onClick={share}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-muted text-base font-semibold text-ink transition-colors hover:bg-surface-muted/70"
            >
              <HugeiconsIcon icon={Share08Icon} size={18} strokeWidth={1.8} aria-hidden />
              Share&hellip;
            </button>
          ) : null}
        </div>
      </Drawer>
    </>
  );
}
