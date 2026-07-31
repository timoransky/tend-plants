import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { plants } from "@/db/schema";
import { apiError, findHousehold, json } from "@/lib/api";
import { computeCareState, overallStatus } from "@/lib/status";

/**
 * Shared handler for "Mark watered" / "Mark fed": set the relevant timestamp to
 * now, scoped by household + plant id, and return the plant with recomputed
 * status so the UI can update the dot immediately.
 */
export async function markCare(
  token: string,
  id: string,
  field: "lastWatered" | "lastFed",
): Promise<Response> {
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const now = new Date();
  const [plant] = await db
    .update(plants)
    .set({ [field]: now })
    .where(and(eq(plants.id, id), eq(plants.householdId, household.id)))
    .returning();

  if (!plant) return apiError(404, "Plant not found");

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
  return json({
    plant: { ...plant, water, feed, status: overallStatus(water, feed) },
  });
}
