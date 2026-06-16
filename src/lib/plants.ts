import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { plants, type Plant } from "@/db/schema";
import {
  CARE_STATUS_RANK,
  computeCareState,
  overallStatus,
  type CareState,
  type CareStatus,
} from "@/lib/status";

export type PlantWithStatus = Plant & {
  water: CareState;
  feed: CareState;
  status: CareStatus | null;
};

/** Attach derived water/feed/overall status to a plant row. */
export function withStatus(plant: Plant, now: Date): PlantWithStatus {
  const water = computeCareState(
    plant.lastWatered,
    plant.waterIntervalDays,
    now,
  );
  const feed = computeCareState(plant.lastFed, plant.feedIntervalDays, now);
  return { ...plant, water, feed, status: overallStatus(water, feed) };
}

/** Most urgent care need first; nulls (no schedule) last. */
export function byUrgency(a: PlantWithStatus, b: PlantWithStatus): number {
  const rank = (s: CareStatus | null) =>
    s == null ? Number.MAX_SAFE_INTEGER : CARE_STATUS_RANK[s];
  return rank(a.status) - rank(b.status);
}

/**
 * Load all plants for a household with computed status, ordered by urgency.
 * Shared by the home page (server component) and the plants API route so there
 * is a single source of truth for status assembly.
 */
export async function listPlantsWithStatus(
  householdId: string,
  now: Date = new Date(),
): Promise<PlantWithStatus[]> {
  const rows = await db
    .select()
    .from(plants)
    .where(eq(plants.householdId, householdId))
    .orderBy(asc(plants.createdAt));

  return rows.map((p) => withStatus(p, now)).sort(byUrgency);
}
