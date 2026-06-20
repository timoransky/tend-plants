"use client";

import {
  Copy01Icon,
  Share08Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";

// These reads never change after mount, so the store never emits.
const noopSubscribe = () => () => {};

/** Sharing a household is just sharing its link — the URL token is the access key. */
export function ShareButton({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Set when the clipboard write throws (insecure context, denied permission):
  // we fall back to selecting the field so the user can copy by hand.
  const [copyFailed, setCopyFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Start every reopen from a clean slate.
    if (!next) {
      setCopied(false);
      setCopyFailed(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable (insecure context, denied permission).
      // Don't leave a dead tap: select the link so the user can copy it by hand,
      // and surface that via the visible hint + live region below.
      setCopied(false);
      setCopyFailed(true);
      inputRef.current?.focus();
      inputRef.current?.select();
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

  const status = copied
    ? "Link copied."
    : copyFailed
      ? "Couldn’t copy automatically. The link is selected; copy it manually."
      : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share this garden"
        className="flex size-9 items-center justify-center rounded-full bg-canvas-soft text-cream transition-colors hover:bg-canvas-soft/70"
      >
        <HugeiconsIcon
          icon={Share08Icon}
          size={17}
          strokeWidth={1.7}
          aria-hidden
        />
      </button>

      <Drawer open={open} onOpenChange={handleOpenChange}>
        <header className="flex items-center gap-4 pb-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink">
            <HugeiconsIcon
              icon={Share08Icon}
              size={26}
              strokeWidth={1.7}
              aria-hidden
            />
          </span>
          <div className="min-w-0">
            <DrawerTitle className="text-2xl font-semibold tracking-tight text-ink">
              Share this garden
            </DrawerTitle>
            <DrawerDescription className="text-sm text-ink-soft">
              There&rsquo;s no login, so anyone with this link can view and edit
              your plants. Share it only with your household.
            </DrawerDescription>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          {/* Read-only link with an inline copy button — the standard share-dialog
              pattern, and the copy affordance present on every device. */}
          <div className="relative">
            <input
              ref={inputRef}
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Shareable link"
              className="no-ios-zoom w-full truncate rounded-xl bg-surface-muted py-3 pl-3.5 pr-12 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
            />
            <motion.button
              type="button"
              onClick={copy}
              aria-label="Copy link"
              whileTap={reduce ? undefined : { scale: 0.9 }}
              className="no-ios-zoom-trailing-center absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
            >
              <CopyMark copied={copied} reduce={!!reduce} />
            </motion.button>
          </div>

          {/* On mobile, the native share sheet is the action that actually sends
              the link, so it leads; copying lives in the field above. On desktop
              there's no share sheet, so the explicit Copy link button leads. */}
          {canShare ? (
            <motion.button
              type="button"
              onClick={share}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-healthy text-base font-semibold text-canvas transition-colors hover:bg-healthy/90"
            >
              <HugeiconsIcon
                icon={Share08Icon}
                size={18}
                strokeWidth={1.8}
                aria-hidden
              />
              Share&hellip;
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={copy}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className="relative flex h-12 w-full items-center justify-center rounded-full bg-healthy text-base font-semibold text-canvas transition-colors hover:bg-healthy/90"
            >
              {/* Invisible sizer pins the width to the widest label, so the pill
                  never resizes when "Copy link" swaps to "Copied!". */}
              <span className="invisible flex items-center gap-2" aria-hidden>
                <HugeiconsIcon icon={Copy01Icon} size={18} strokeWidth={2} />
                Copy link
              </span>
              <span className="absolute inset-0 flex items-center justify-center gap-2">
                <CopyMark copied={copied} reduce={!!reduce} />
                {copied ? "Copied!" : "Copy link"}
              </span>
            </motion.button>
          )}

          {copyFailed ? (
            <p className="text-xs text-feed-ink">
              Couldn&rsquo;t copy automatically. The link is selected; copy it
              manually.
            </p>
          ) : null}
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>
      </Drawer>
    </>
  );
}

/**
 * The copy icon, swapping to a check on success with the app's signature spring
 * (mirrors the Mark-watered tick in PlantDetail). Motion is disabled when the
 * user prefers reduced motion.
 */
function CopyMark({ copied, reduce }: { copied: boolean; reduce: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {copied ? (
        <motion.span
          key="tick"
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
          transition={
            reduce
              ? { duration: 0.12 }
              : { type: "spring", stiffness: 500, damping: 16 }
          }
        >
          <HugeiconsIcon
            icon={Tick02Icon}
            size={18}
            strokeWidth={2}
            aria-hidden
          />
        </motion.span>
      ) : (
        <motion.span
          key="copy"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <HugeiconsIcon
            icon={Copy01Icon}
            size={18}
            strokeWidth={2}
            aria-hidden
          />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
