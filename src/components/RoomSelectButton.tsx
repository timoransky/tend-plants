"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useReducedMotion } from "motion/react";

import { neutralButton } from "@/lib/ui";
import { ICON_SM, TickIcon } from "@/lib/icons";

/**
 * The room-header select control. NOT a watering action — it drives the
 * dashboard's global multi-select:
 *   - idle: "Select all" enters select mode with this whole room preselected.
 *   - selecting: a per-room toggle — "Select all" adds the room's plants to the
 *     selection, "Deselect all" removes them — so a selection can span rooms.
 *
 * Deliberately quiet (no water tint, no droplet): watering stays a two-step flow
 * confirmed in the bottom bar, and a calm utility label won't read as a repeated
 * call-to-action on every header. The "needs water" nudge lives on the header
 * count instead. A small water-blue tick appears only when this room is fully
 * selected, echoing the avatars' selection ring.
 */
export function RoomSelectButton({
  selecting,
  allSelected,
  room,
  disabled,
  onClick,
}: {
  selecting: boolean;
  allSelected: boolean;
  room: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();
  const deselect = selecting && allSelected;
  const label = deselect ? "Deselect all" : "Select all";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} plants in ${room}`}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full ${neutralButton} px-2.5 text-[0.7rem] font-medium text-cream-soft outline-none transition-colors duration-200 hover:text-cream focus-visible:ring-2 focus-visible:ring-cream/25 disabled:opacity-40`}
    >
      {deselect ? (
        <HugeiconsIcon
          icon={TickIcon}
          size={ICON_SM}
          strokeWidth={2.2}
          className="shrink-0 text-water"
          aria-hidden
        />
      ) : null}
      {label}
    </motion.button>
  );
}
