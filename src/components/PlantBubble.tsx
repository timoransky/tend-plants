"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PlantWithStatus } from "@/lib/plants";

/**
 * Hover/press feedback for the bubble. The whole button is one target: hovering
 * anywhere (avatar or label) lifts the bubble toward the viewer with a gentle
 * scale, like picking the pot up off the dim canvas. Calm ease-out, no bounce.
 */
const bubbleMotion = {
  rest: { y: 0, scale: 1 },
  hover: { y: -5, scale: 1.05 },
  tap: { y: -1, scale: 0.96 },
};

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
    <motion.button
      type="button"
      onClick={() => onSelect(plant)}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-label={`${plant.name}${plant.room ? `, ${plant.room}` : ""}, ${stateLabel}`}
      initial="rest"
      animate="rest"
      whileHover={reduce ? undefined : "hover"}
      whileTap={reduce ? undefined : "tap"}
      className="rise group flex flex-col items-center gap-1.5 rounded-3xl p-1.5 text-center outline-none transition-colors focus-visible:bg-canvas-soft"
    >
      <motion.span
        variants={bubbleMotion}
        transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <span className="flex size-[5.5rem] items-center justify-center rounded-full bg-surface text-4xl shadow-[0_1px_3px_0_rgb(20_16_8_/_0.35)] transition-shadow duration-200 ease-out group-hover:shadow-[0_14px_28px_-4px_rgb(20_16_8_/_0.5)]">
          <span aria-hidden>{plant.avatar ?? "🪴"}</span>
        </span>
        {needsWater ? (
          <span className="absolute bottom-1 right-1 flex size-3">
            {thirsty && !reduce ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-water opacity-75 z-10" />
            ) : null}
            <span className="relative inline-flex size-3 rounded-full bg-water ring-[3px] ring-canvas" />
          </span>
        ) : null}
      </motion.span>
      <span className="max-w-[6.5rem] truncate text-xs font-medium text-cream">
        {plant.name}
      </span>
    </motion.button>
  );
}
