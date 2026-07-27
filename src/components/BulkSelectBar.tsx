"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { BodyPortal } from "@/components/BodyPortal";
import { buttonLg, neutralButton, tapScale } from "@/lib/ui";

export type BulkBarState = "selecting" | "pending" | "undo" | null;

/**
 * The viewport-anchored action bar for multi-select watering. Portaled to
 * <body> (out of vaul's transformed drawer wrapper) so it stays pinned to the
 * bottom of the screen. Three phases:
 *   - selecting: Cancel + "Mark watered (n)".
 *   - pending: "Watering…", disabled.
 *   - undo: "✓ Watered n · Undo" (green), auto-committing after ~6s.
 * `state: null` animates the whole bar out. Slides up on enter, down on exit;
 * opacity-only under reduced motion.
 */
export function BulkSelectBar({
  count,
  state,
  onWater,
  onCancel,
  onUndo,
}: {
  count: number;
  state: BulkBarState;
  onWater: () => void;
  onCancel: () => void;
  onUndo: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <BodyPortal>
      <AnimatePresence>
        {state ? (
          <motion.div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-canvas via-canvas to-transparent pt-16"
            initial={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0.15 }
                : { duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }
            }
          >
            <div className="pointer-events-auto mx-auto flex max-w-2xl gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {state === "undo" ? (
                <button
                  type="button"
                  onClick={onUndo}
                  className={`${buttonLg} flex-1 gap-1 bg-healthy text-canvas ${tapScale}`}
                >
                  <span aria-hidden>✓</span> Watered {count} ·{" "}
                  <span className="underline">Undo</span>
                </button>
              ) : state === "pending" ? (
                <button
                  type="button"
                  disabled
                  className={`${buttonLg} flex-1 bg-water text-canvas opacity-80`}
                >
                  Watering…
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    className={`${buttonLg} ${neutralButton} px-6 text-cream ${tapScale}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onWater}
                    disabled={count === 0}
                    className={`${buttonLg} flex-1 bg-water text-canvas ${tapScale} hover:bg-water/90 disabled:opacity-60`}
                  >
                    Mark watered ({count})
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BodyPortal>
  );
}
