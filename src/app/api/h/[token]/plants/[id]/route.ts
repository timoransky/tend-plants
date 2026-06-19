import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { plants } from "@/db/schema";
import { apiError, findHousehold, json, readJson } from "@/lib/api";
import { computeCareState, overallStatus } from "@/lib/status";

type Params = { params: Promise<{ token: string; id: string }> };

type EditPlantBody = {
  name?: unknown;
  room?: unknown;
  avatar?: unknown;
  waterIntervalDays?: unknown;
  waterNote?: unknown;
  lightNote?: unknown;
  feedIntervalDays?: unknown;
  feedNote?: unknown;
  notes?: unknown;
};

function optString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function optInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * PATCH /api/h/[token]/plants/[id] — edit a plant (name, room, avatar,
 * intervals, notes). Only the fields present in the body are changed. Always
 * scoped by household so a token can only edit its own plants.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { token, id } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const body = await readJson<EditPlantBody>(request);
  if (!body) return apiError(400, "Invalid JSON body");

  const updates: Partial<typeof plants.$inferInsert> = {};

  if ("name" in body) {
    const name = optString(body.name);
    if (!name) return apiError(400, "`name` cannot be empty");
    updates.name = name;
  }
  if ("room" in body) updates.room = optString(body.room);
  if ("avatar" in body) updates.avatar = optString(body.avatar);
  if ("waterIntervalDays" in body)
    updates.waterIntervalDays = optInt(body.waterIntervalDays);
  if ("waterNote" in body) updates.waterNote = optString(body.waterNote);
  if ("lightNote" in body) updates.lightNote = optString(body.lightNote);
  if ("feedIntervalDays" in body)
    updates.feedIntervalDays = optInt(body.feedIntervalDays);
  if ("feedNote" in body) updates.feedNote = optString(body.feedNote);
  if ("notes" in body) updates.notes = optString(body.notes);

  if (Object.keys(updates).length === 0) {
    return apiError(400, "No editable fields provided");
  }

  const [plant] = await db
    .update(plants)
    .set(updates)
    .where(and(eq(plants.id, id), eq(plants.householdId, household.id)))
    .returning();

  if (!plant) return apiError(404, "Plant not found");

  const now = new Date();
  const water = computeCareState(
    plant.lastWatered,
    plant.waterIntervalDays,
    now,
  );
  const feed = computeCareState(plant.lastFed, plant.feedIntervalDays, now);
  return json({
    plant: { ...plant, water, feed, status: overallStatus(water, feed) },
  });
}

/**
 * DELETE /api/h/[token]/plants/[id] — remove a plant. Scoped by household so a
 * token can only delete its own plants; a missing/foreign id is a 404.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { token, id } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const [deleted] = await db
    .delete(plants)
    .where(and(eq(plants.id, id), eq(plants.householdId, household.id)))
    .returning({ id: plants.id });

  if (!deleted) return apiError(404, "Plant not found");
  return json({ ok: true });
}
