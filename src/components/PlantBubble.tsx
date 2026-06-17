"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PlantWithStatus } from "@/lib/plants";

/**
 * A plant in the grid: a uniform circular avatar with its name, that opens the
 * detail drawer. A small water-blue dot sits in the corner when the plant needs
 * water — it pings when due now (overdue / due today) and is static when due
 * soon. Healthy plants show no dot. Feeding is hidden, so this is water-only.
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
  const needsWater = thirsty || soon;
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
        {needsWater ? (
          <span className="absolute bottom-1 right-1 flex size-3">
            {thirsty && !reduce ? (
              <span className="absolute -inset-1 inline-flex animate-ping rounded-full bg-water opacity-75" />
            ) : null}
            <span className="relative inline-flex size-3 rounded-full bg-water ring-[3px] ring-canvas" />
          </span>
        ) : null}
      </span>
      <span className="max-w-[6.5rem] truncate text-xs font-medium text-cream">
        {plant.name}
      </span>
    </button>
  );
}
