"use client";

import { motion, useReducedMotion } from "motion/react";

import { WaterDropBadge } from "@/components/WaterDropBadge";

/**
 * The room-header pill. It does NOT water on tap — that would be too easy to hit
 * by accident while reaching for the accordion toggle. Instead it enters
 * multi-select mode with the whole room preselected, so watering is always a
 * deliberate two-step (adjust the selection, then confirm in the bottom bar).
 *
 * Blue when the room has thirsty plants (a gentle nudge), calm neutral
 * otherwise. Disabled while a selection is already in progress.
 */
export function RoomWaterPill({
  thirsty,
  room,
  disabled,
  onSelect,
}: {
  thirsty: number;
  room: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={`Select plants to water in ${room}`}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.7rem] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-water/50 disabled:opacity-40 ${
        thirsty > 0
          ? "bg-water/15 text-water"
          : "bg-canvas-soft/60 text-cream-soft hover:text-cream"
      }`}
    >
      <WaterDropBadge className="size-3 shrink-0" /> Water multiple
    </motion.button>
  );
}
