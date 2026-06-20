"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useReducedMotion } from "motion/react";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";

/**
 * Success confirmation as a nested drawer over the add-plant form: once a plant
 * is saved it slides up (scaling the form back) and offers the two next steps —
 * keep adding, or finish and head home. Same nested-sheet flow as the edit /
 * delete drawers over plant detail, and built on the same chrome as
 * <DeletePlantDrawer> — a calm green confirmation rather than a destructive
 * question. A green tick badge scales onto the plant's avatar (skipped when the
 * user prefers reduced motion).
 */
export function AddedPlantDrawer({
  name,
  avatar,
  open,
  onOpenChange,
  onAddAnother,
  onDone,
}: {
  name: string;
  avatar: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <Drawer nested open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-3xl">
            <span aria-hidden>{avatar || "🪴"}</span>
            <motion.span
              aria-hidden
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0.12 }
                  : { type: "spring", stiffness: 420, damping: 22, delay: 0.08 }
              }
              className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-healthy text-canvas ring-2 ring-surface"
            >
              <HugeiconsIcon
                icon={Tick02Icon}
                size={16}
                strokeWidth={2.5}
                aria-hidden
              />
            </motion.span>
          </span>
          <div className="min-w-0">
            <DrawerTitle className="truncate text-xl font-semibold tracking-tight text-ink">
              {name} added
            </DrawerTitle>
            <DrawerDescription className="text-sm text-ink-soft">
              Saved to your plants.
            </DrawerDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onAddAnother}
            className="h-12 w-full rounded-full bg-healthy text-base font-semibold text-canvas transition-colors hover:bg-healthy/90"
          >
            Add another plant
          </button>
          <button
            type="button"
            onClick={onDone}
            className="h-12 w-full rounded-full bg-surface-muted text-base font-semibold text-ink transition-colors hover:bg-surface-muted/70"
          >
            Done
          </button>
        </div>
      </div>
    </Drawer>
  );
}
