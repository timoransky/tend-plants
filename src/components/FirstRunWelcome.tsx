"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

import {
  getOnboarded,
  getOnboardedServerSnapshot,
  setOnboarded,
  subscribe,
} from "@/lib/household-storage";
import { tapScale } from "@/lib/ui";

/**
 * First-run welcome. Tend has no accounts — the URL token is the only key — so a
 * brand-new visitor needs to learn two things, once: this link *is* their garden
 * (bookmark it), and sharing the link hands over full edit access. Shown once per
 * browser, inline above the garden (never a modal, never blocking), easy to
 * dismiss. SSR renders nothing (server snapshot = onboarded), so it reveals only
 * after hydration for genuine first-timers — no flash, no hydration mismatch.
 */
export function FirstRunWelcome() {
  const reduce = useReducedMotion();
  const onboarded = useSyncExternalStore(
    subscribe,
    getOnboarded,
    getOnboardedServerSnapshot,
  );

  return (
    <AnimatePresence>
      {onboarded ? null : (
        <motion.section
          role="note"
          aria-labelledby="welcome-heading"
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 rounded-3xl bg-surface px-5 py-4"
        >
          <h2
            id="welcome-heading"
            className="text-balance text-base font-semibold text-ink"
          >
            Welcome to your garden
          </h2>
          <p className="mt-1.5 text-pretty text-sm text-ink-soft">
            There&apos;s no login. This link is your garden, so bookmark it to
            find your way back.
          </p>
          <p className="mt-1 text-pretty text-sm text-ink-soft">
            Share the link with your household and you&apos;ll all tend the same
            plants. Anyone who has it can water, add, and edit.
          </p>
          <button
            type="button"
            onClick={setOnboarded}
            className={`mt-3 rounded-full bg-healthy px-4 py-2 text-sm font-semibold text-canvas outline-none ${tapScale} hover:bg-healthy/90 focus-visible:ring-2 focus-visible:ring-healthy/50`}
          >
            Got it
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
