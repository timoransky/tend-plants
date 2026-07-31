import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { plants, type Plant } from "@/db/schema";
import {
  CARE_STATUS_RANK,
  computeCareState,
  overallStatus,
  type CareState,
  type CareStatus,
} from "@/lib/status";
import { publicUrl } from "@/lib/storage";

export type PlantWithStatus = Plant & {
  water: CareState;
  feed: CareState;
  status: CareStatus | null;
  // Public URL for the avatar photo, derived from `avatarImageKey`, or null.
  // Clients render this when present and fall back to the emoji otherwise.
  avatarUrl: string | null;
};

/** Attach derived water/feed/overall status (and the avatar URL) to a plant. */
export function withStatus(plant: Plant, now: Date): PlantWithStatus {
  // `createdAt` anchors the schedule for care that has never been performed —
  // a freshly added plant is fine for a full interval, not overdue on day one.
  const water = computeCareState(
    plant.lastWatered,
    plant.waterIntervalDays,
    now,
    plant.createdAt,
  );
  const feed = computeCareState(
    plant.lastFed,
    plant.feedIntervalDays,
    now,
    plant.createdAt,
  );
  return {
    ...plant,
    water,
    feed,
    status: overallStatus(water, feed),
    avatarUrl: plant.avatarImageKey ? publicUrl(plant.avatarImageKey) : null,
  };
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

/** Load a single plant (scoped to its household) with computed status. */
export async function getPlantWithStatus(
  householdId: string,
  id: string,
  now: Date = new Date(),
): Promise<PlantWithStatus | null> {
  const rows = await db
    .select()
    .from(plants)
    .where(and(eq(plants.id, id), eq(plants.householdId, householdId)))
    .limit(1);
  return rows[0] ? withStatus(rows[0], now) : null;
}
