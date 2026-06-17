"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PlantWithStatus } from "@/lib/plants";

/**
 * One plant in the packed garden: a tappable circular avatar that fills the slot
 * the garden positions it in, and opens the detail drawer. Urgency is water-only
 * (feeding is hidden) — a water-blue ring plus a gentle breathing pulse mark
 * plants that need water; healthy plants are unmarked. The name shows on
 * hover/focus to keep the cluster clean, and the avatar carries a `layoutId` so
 * it flies into the drawer header. Sizing/position is set by the parent.
 */
export function PlantBubble({
  plant,
  rotate,
  breatheDelay,
  delayMs,
  onSelect,
}: {
  plant: PlantWithStatus;
  rotate: number;
  breatheDelay: number;
  delayMs: number;
  onSelect: (plant: PlantWithStatus) => void;
}) {
  const reduce = useReducedMotion();
  const status = plant.water.status;
  const thirsty = status === "overdue" || status === "due_today";
  const soon = status === "upcoming";

  const ring = thirsty ? "ring-4 ring-water/80" : soon ? "ring-2 ring-water/30" : "";
  const stateLabel = thirsty ? "needs water" : soon ? "water soon" : "healthy";

  return (
    <button
      type="button"
      onClick={() => onSelect(plant)}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-label={`${plant.name}${plant.room ? `, ${plant.room}` : ""}, ${stateLabel}`}
      className="rise group relative size-full rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-healthy"
    >
      <motion.span
        layoutId={`plant-avatar-${plant.id}`}
        whileHover={reduce ? undefined : { scale: 1.08 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        style={{ animationDelay: `${breatheDelay}s` }}
        className={`flex size-full items-center justify-center rounded-full bg-surface shadow-sm transition-shadow duration-500 ${ring} ${thirsty ? "breathe" : ""}`}
      >
        <span aria-hidden style={{ transform: `rotate(${rotate}deg)` }}>
          {plant.avatar ?? "🪴"}
        </span>
      </motion.span>

      {/* Name reveals on hover/focus so the packed cluster stays calm. */}
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-canvas-soft px-1.5 py-0.5 text-[0.7rem] font-medium text-cream opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        {plant.name}
      </span>
    </button>
  );
}
