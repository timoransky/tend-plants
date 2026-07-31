import type { CareState, CareStatus } from "@/lib/status";
import { CARE_STATUS_RANK } from "@/lib/status";
import type { CareKind } from "@/lib/tasks";

/** Tailwind background classes for a care kind (the status-dot / task accent). */
export const KIND_BG: Record<CareKind | "healthy", string> = {
  water: "bg-water",
  feed: "bg-feed",
  healthy: "bg-healthy",
};

export const KIND_TEXT: Record<CareKind | "healthy", string> = {
  water: "text-water",
  feed: "text-feed",
  healthy: "text-healthy",
};

/**
 * Which of the three water badges a plant shows in the grid, or null for
 * "nothing to say". Resolved here (rather than in the bubble) so every surface
 * agrees on precedence: actually being due always outranks having just been
 * watered, which in turn outranks the heads-up — the two can only overlap on a
 * degenerate 1-day interval, where "someone did this today" is the useful read.
 */
export type WaterBadge = "due" | "fresh" | "soon";

export function waterBadge(water: CareState): WaterBadge | null {
  if (water.status === "overdue" || water.status === "due_today") return "due";
  if (water.fresh) return "fresh";
  if (water.status === "upcoming") return "soon";
  return null;
}

/**
 * Which need drives the plant's status dot. Blue (water) / brown (feed) when
 * something is due, green (healthy) when nothing is. Water wins ties since it's
 * the primary urgent color in the spec.
 */
export function primaryNeed(
  water: CareState,
  feed: CareState,
): { kind: CareKind | "healthy"; status: CareStatus | null } {
  const w = water.status;
  const f = feed.status;
  const actionable = (s: CareStatus | null) => s != null && s !== "fine";

  if (!actionable(w) && !actionable(f)) {
    return { kind: "healthy", status: w ?? f };
  }
  if (actionable(w) && actionable(f)) {
    // Both need care — color by the more urgent; tie → water.
    return CARE_STATUS_RANK[f!] < CARE_STATUS_RANK[w!]
      ? { kind: "feed", status: f }
      : { kind: "water", status: w };
  }
  return actionable(w)
    ? { kind: "water", status: w }
    : { kind: "feed", status: f };
}
