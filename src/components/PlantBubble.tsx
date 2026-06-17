"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PlantWithStatus } from "@/lib/plants";
import type { Scatter } from "@/lib/scatter";

// Every bubble is the same size; plants that need water get one step bigger.
const BASE_SIZE = "size-20 text-3xl";
const THIRSTY_SIZE = "size-24 text-4xl";

/**
 * One plant in the scattered garden: a tappable circular avatar that opens the
 * detail drawer. Urgency is water-only (feeding is hidden) — a water-blue ring
 * plus a gentle breathing pulse mark plants that need water; healthy plants are
 * unmarked. The avatar carries a `layoutId` so it flies into the drawer header.
 */
export function PlantBubble({
  plant,
  scatter,
  delayMs,
  onSelect,
}: {
  plant: PlantWithStatus;
  scatter: Scatter;
  delayMs: number;
  onSelect: (plant: PlantWithStatus) => void;
}) {
  const reduce = useReducedMotion();
  const status = plant.water.status;
  const thirsty = status === "overdue" || status === "due_today";
  const soon = status === "upcoming";

  const ring = thirsty ? "ring-4 ring-water/80" : soon ? "ring-2 ring-water/30" : "";
  const sizeClass = thirsty ? THIRSTY_SIZE : BASE_SIZE;
  const stateLabel = thirsty ? "needs water" : soon ? "water soon" : "healthy";

  return (
    // Outer wrapper holds the (static) scatter offset so it never fights the
    // `.rise` entrance transform on the button below.
    <div style={{ transform: `translate(${scatter.dx}px, ${scatter.dy}px)` }}>
      <button
        type="button"
        onClick={() => onSelect(plant)}
        style={{ animationDelay: `${delayMs}ms` }}
        aria-label={`${plant.name}${plant.room ? `, ${plant.room}` : ""}, ${stateLabel}`}
        className="rise flex flex-col items-center gap-1.5 rounded-3xl p-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-healthy/60"
      >
        <motion.span
          layoutId={`plant-avatar-${plant.id}`}
          whileHover={reduce ? undefined : { scale: 1.06 }}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          style={{ animationDelay: `${scatter.breatheDelay}s` }}
          className={`relative flex ${sizeClass} items-center justify-center rounded-full bg-surface shadow-sm transition-shadow duration-500 ${ring} ${thirsty ? "breathe" : ""}`}
        >
          <span aria-hidden style={{ transform: `rotate(${scatter.rotate}deg)` }}>
            {plant.avatar ?? "🪴"}
          </span>
        </motion.span>
        <span className="max-w-[6.5rem] truncate text-xs font-medium text-cream">
          {plant.name}
        </span>
      </button>
    </div>
  );
}
