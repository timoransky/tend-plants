/**
 * Deterministic, SSR-stable per-plant variation for the home garden.
 *
 * Values are derived purely from a plant's id (a UUID string) via a small hash,
 * so the server and client render identically (no hydration mismatch) and a
 * bubble keeps its look even when the urgency sort reorders the list. No
 * `Math.random`, no `Date.now` — both would break SSR and stability. (Bubble
 * positions come from the packing in `cluster.ts`; this only adds a little tilt
 * and desyncs the breathing pulse.)
 */

export type Scatter = {
  rotate: number; // deg, avatar tilt ~[-5, 5]
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
  return {
    rotate: (rand01(s, 3) - 0.5) * 10,
    breatheDelay: rand01(s, 4) * 1.2,
  };
}
