"use client";

import { motion, useReducedMotion } from "motion/react";

import { PlantAvatar } from "@/components/PlantAvatar";
import { WaterDropBadge } from "@/components/WaterDropBadge";
import type { PlantWithStatus } from "@/lib/plants";

/**
 * Hover/press feedback for the tile. The whole button is one target: hovering
 * anywhere (thumbnail or label) lifts the tile toward the viewer with a gentle
 * scale, like picking the pot up off the dim canvas. Calm ease-out, no bounce.
 */
const bubbleMotion = {
  rest: { y: 0, scale: 1 },
  hover: { y: -5, scale: 1.04 },
  tap: { y: -1, scale: 0.97 },
};

/**
 * A plant in the grid: a generously-rounded square tile with its name, that
 * opens the detail drawer. When the plant has a photo it fills the tile
 * edge-to-edge (no circular crop — the photo *is* the tile); an emoji plant
 * shows its glyph centred on the warm cream surface. Both the thumbnail size
 * and the emoji scale with the tile (container queries), so the grid-size
 * control resizes everything in one move.
 *
 * A small water-blue droplet badge sits in the corner when the plant needs
 * water — it pings when due now (overdue / due today) and is static when due
 * soon. Healthy plants show no badge. Feeding is hidden, so this is water-only.
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
        className="relative block w-full @container"
      >
        <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[clamp(1rem,16cqw,1.75rem)] bg-surface leading-none text-[45cqw] shadow-[0_1px_2px_0_rgb(20_16_8_/_0.4),0_4px_8px_-2px_rgb(20_16_8_/_0.28)] transition-shadow duration-200 ease-out group-hover:shadow-[0_2px_5px_-1px_rgb(20_16_8_/_0.4),0_16px_30px_-6px_rgb(20_16_8_/_0.45)]">
          <PlantAvatar
            avatar={plant.avatar}
            imageUrl={plant.avatarUrl}
            alt={plant.name}
            imgClassName=""
          />
        </span>
        {needsWater ? (
          <span className="absolute bottom-[6%] right-[6%] size-[clamp(1rem,20cqw,1.5rem)]">
            {thirsty && !reduce ? (
              <WaterDropBadge
                solid
                className="absolute inset-0 size-full animate-ping opacity-75 [animation-duration:1.8s]"
              />
            ) : null}
            <WaterDropBadge className="relative size-full drop-shadow-[0_1px_2px_rgb(20_16_8_/_0.55)]" />
          </span>
        ) : null}
      </motion.span>
      <span className="w-full truncate px-0.5 text-xs font-medium text-cream">
        {plant.name}
      </span>
    </motion.button>
  );
}
