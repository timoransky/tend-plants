"use client";

import { motion, useReducedMotion } from "motion/react";

import type { PlantWithStatus } from "@/lib/plants";

/** Deterministic [0, 1.2)s delay so breathing pulses desync (FNV-1a of id). */
function breatheDelay(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((Math.imul((h >>> 0) ^ 0x9e3779b1, 0x85ebca6b) >>> 0) / 0xffffffff) * 1.2;
}

/**
 * A plant in the grid: a uniform circular avatar with its name, that opens the
 * detail drawer. Urgency is water-only (feeding is hidden) — a water-blue ring
 * plus a gentle breathing pulse mark plants that need water; healthy plants are
 * unmarked.
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

  const ring = thirsty ? "ring-4 ring-water/80" : soon ? "ring-2 ring-water/30" : "";
  const stateLabel = thirsty ? "needs water" : soon ? "water soon" : "healthy";

  return (
    <button
      type="button"
      onClick={() => onSelect(plant)}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-label={`${plant.name}${plant.room ? `, ${plant.room}` : ""}, ${stateLabel}`}
      className="rise group flex flex-col items-center gap-1.5 rounded-3xl p-1.5 text-center outline-none transition-colors hover:bg-canvas-soft focus-visible:bg-canvas-soft"
    >
      <motion.span
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        style={{ animationDelay: `${breatheDelay(plant.id)}s` }}
        className={`flex size-20 items-center justify-center rounded-full bg-surface text-3xl shadow-sm transition-shadow duration-500 ${ring} ${thirsty ? "breathe" : ""}`}
      >
        <span aria-hidden>{plant.avatar ?? "🪴"}</span>
      </motion.span>
      <span className="max-w-[6.5rem] truncate text-xs font-medium text-cream">
        {plant.name}
      </span>
    </button>
  );
}
