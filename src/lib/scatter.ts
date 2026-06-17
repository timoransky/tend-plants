/**
 * Deterministic, SSR-stable "scatter" for the home garden.
 *
 * Every value is derived purely from a plant's id (a UUID string) via a small
 * hash, so the server and client render identical transforms (no hydration
 * mismatch) and a bubble keeps its spot even when the urgency sort reorders the
 * list. No `Math.random`, no `Date.now` — both would break SSR and stability.
 *
 * Ranges are bounded and the garden layout keeps its row-gap larger than the
 * vertical spread, so bubbles never overlap illegibly.
 */

export type ScatterSize = "sm" | "md" | "lg";

export type Scatter = {
  dx: number; // px, horizontal nudge ~[-6, 6]
  dy: number; // px, vertical nudge ~[-14, 14]
  rotate: number; // deg, avatar tilt ~[-5, 5]
  size: ScatterSize;
  breatheDelay: number; // s, desyncs the breathing pulse, [0, 1.2)
};

/** FNV-1a hash → uint32. Stable across server/client. */
function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Derive an independent [0, 1) stream from one seed by re-hashing with a salt. */
function rand01(seed: number, salt: number): number {
  const h = Math.imul(seed ^ (salt * 0x9e3779b1), 0x85ebca6b) >>> 0;
  return h / 0xffffffff;
}

export function scatterFor(id: string): Scatter {
  const s = hash32(id);
  const sizeRoll = rand01(s, 7);
  return {
    dx: Math.round((rand01(s, 1) - 0.5) * 12),
    dy: Math.round((rand01(s, 2) - 0.5) * 28),
    rotate: (rand01(s, 3) - 0.5) * 10,
    size: sizeRoll < 0.28 ? "sm" : sizeRoll > 0.78 ? "lg" : "md",
    breatheDelay: rand01(s, 4) * 1.2,
  };
}
