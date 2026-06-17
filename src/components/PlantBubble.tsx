"use client";

import { motion, useReducedMotion } from "motion/react";

import { StatusDot } from "@/components/StatusDot";
import type { PlantWithStatus } from "@/lib/plants";

/**
 * A plant in the grid: a uniform circular avatar with its name, that opens the
 * detail drawer. A status dot in the corner shows water state (blue when due,
 * green when fine) and pulses when the plant needs water. Feeding is hidden, so
 * the dot is water-only (see StatusDot).
 */
export function PlantBubble({
  plant,
  delayMs,
  onSelect,
}: {
  plant: PlantWithStatus;
  delayMs: number;
  onSelect: (plant: PlantWithStatus) => void;
}) {
  const reduce = useReducedMotion();
  const status = plant.water.status;
  const thirsty = status === "overdue" || status === "due_today";
  const soon = status === "upcoming";
  const stateLabel = thirsty ? "needs water" : soon ? "water soon" : "healthy";

  return (
    <button
      type="button"
      onClick={() => onSelect(plant)}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-label={`${plant.name}${plant.room ? `, ${plant.room}` : ""}, ${stateLabel}`}
      className="rise group flex flex-col items-center gap-1.5 rounded-3xl p-1.5 text-center outline-none transition-colors hover:bg-canvas-soft focus-visible:bg-canvas-soft"
    >
      <span className="relative">
        <motion.span
          whileHover={reduce ? undefined : { scale: 1.06 }}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          className="flex size-20 items-center justify-center rounded-full bg-surface text-3xl shadow-sm"
        >
          <span aria-hidden>{plant.avatar ?? "🪴"}</span>
        </motion.span>
        <StatusDot
          water={plant.water}
          feed={plant.feed}
          className={`absolute bottom-0.5 right-0.5 size-4 ${
            thirsty && !reduce ? "animate-pulse" : ""
          }`}
        />
      </span>
      <span className="max-w-[6.5rem] truncate text-xs font-medium text-cream">
        {plant.name}
      </span>
    </button>
  );
}
