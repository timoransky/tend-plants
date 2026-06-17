import type { PlantWithStatus } from "@/lib/plants";
import type { RoomGroup } from "@/lib/group-rooms";

/**
 * Deterministic, SSR-stable cluster packing for the home garden.
 *
 * Each room seeds its own little sub-cluster via a sunflower/phyllotaxis spiral
 * (the golden angle gives even spacing), the rooms start close to the centre so
 * the whole thing reads as one organic blob, and a deterministic relaxation pass
 * then gently pushes any overlapping bubbles apart. The result: one cohesive
 * cluster with rooms as loose sub-groupings and no collisions — for any plant
 * counts, without `Math.random`/`Date.now` (which would break SSR + stability).
 *
 * Output positions are percentages of the cluster's bounding box; the garden
 * renders them inside an aspect-ratio container sized in container-query units,
 * so the whole blob scales with the viewport without overlap drift.
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈137.5°

// Design-space px. SPACING seeds the spiral spacing; ROOM_SEP starts rooms close
// (cohesive blob) before relaxation; radii drive collision resolution; PAD keeps
// edge bubbles inside the box. BASE/THIRSTY mirror the rendered bubble sizes.
const SPACING = 84;
const ROOM_SEP = 0.62;
const PAD = 50;
const BASE_R = 40;
const THIRSTY_R = 44;
const GAP = 3; // min breathing room between bubble edges
const RELAX_ITERS = 90;

type Node = { id: string; x: number; y: number; r: number };

export type ClusterLayout = {
  width: number;
  height: number;
  pos: Map<string, { xPct: number; yPct: number }>;
};

function radiusOf(p: PlantWithStatus): number {
  const thirsty =
    p.water.status === "overdue" || p.water.status === "due_today";
  return (thirsty ? THIRSTY_R : BASE_R) + GAP;
}

/** Radius of a room's local phyllotaxis sub-cluster (centre → furthest plant). */
function subRadius(count: number): number {
  return count <= 1 ? 0 : SPACING * Math.sqrt(count - 1);
}

export function clusterLayout(groups: RoomGroup[]): ClusterLayout {
  const n = groups.length;
  const ringR =
    n <= 1
      ? 0
      : (Math.max(...groups.map((g) => subRadius(g.plants.length))) + SPACING) *
        ROOM_SEP;

  // Seed positions: each room a phyllotaxis sub-cluster around its ring point.
  const nodes: Node[] = [];
  groups.forEach((group, gi) => {
    const a0 = (gi / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    const cx = n <= 1 ? 0 : ringR * Math.cos(a0);
    const cy = n <= 1 ? 0 : ringR * Math.sin(a0);
    group.plants.forEach((plant, pi) => {
      const r = SPACING * Math.sqrt(pi);
      const a = pi * GOLDEN_ANGLE + gi; // +gi desyncs rooms at shared edges
      nodes.push({
        id: plant.id,
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        r: radiusOf(plant),
      });
    });
  });

  relax(nodes);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const nd of nodes) {
    minX = Math.min(minX, nd.x - nd.r);
    maxX = Math.max(maxX, nd.x + nd.r);
    minY = Math.min(minY, nd.y - nd.r);
    maxY = Math.max(maxY, nd.y + nd.r);
  }
  if (!Number.isFinite(minX)) minX = maxX = minY = maxY = 0;
  minX -= PAD - BASE_R;
  minY -= PAD - BASE_R;
  maxX += PAD - BASE_R;
  maxY += PAD - BASE_R;

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  const pos = new Map<string, { xPct: number; yPct: number }>();
  for (const nd of nodes) {
    pos.set(nd.id, {
      xPct: ((nd.x - minX) / width) * 100,
      yPct: ((nd.y - minY) / height) * 100,
    });
  }
  return { width, height, pos };
}

/** Push overlapping bubbles apart, deterministically (no randomness). */
function relax(nodes: Node[]): void {
  for (let iter = 0; iter < RELAX_ITERS; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min) continue;
        if (d === 0) {
          // Coincident — separate along a stable, index-derived axis.
          dx = (i % 2 === 0 ? 1 : -1);
          dy = (j % 2 === 0 ? 1 : -1);
          d = Math.hypot(dx, dy);
        }
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
}
