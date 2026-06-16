import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { plants, type Plant } from "@/db/schema";
import { apiError, findHousehold, json, readJson } from "@/lib/api";
import {
  CARE_STATUS_RANK,
  computeCareState,
  overallStatus,
  type CareState,
  type CareStatus,
} from "@/lib/status";

type Params = { params: Promise<{ token: string }> };

export type PlantWithStatus = Plant & {
  water: CareState;
  feed: CareState;
  status: CareStatus | null;
};

/** Attach derived water/feed/overall status to a plant row. */
function withStatus(plant: Plant, now: Date): PlantWithStatus {
  const water = computeCareState(
    plant.lastWatered,
    plant.waterIntervalDays,
    now,
  );
  const feed = computeCareState(plant.lastFed, plant.feedIntervalDays, now);
  return { ...plant, water, feed, status: overallStatus(water, feed) };
}

/** Most urgent care need first; nulls (no schedule) last. */
function byUrgency(a: PlantWithStatus, b: PlantWithStatus): number {
  const rank = (s: CareStatus | null) =>
    s == null ? Number.MAX_SAFE_INTEGER : CARE_STATUS_RANK[s];
  return rank(a.status) - rank(b.status);
}

/**
 * GET /api/h/[token]/plants — all plants for the household with computed
 * status, ordered by urgency (drives the home timeline + status dots).
 */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const rows = await db
    .select()
    .from(plants)
    .where(eq(plants.householdId, household.id))
    .orderBy(asc(plants.createdAt));

  const now = new Date();
  const withStatuses = rows.map((p) => withStatus(p, now)).sort(byUrgency);

  return json({ plants: withStatuses });
}

type AddPlantBody = {
  name?: unknown;
  room?: unknown;
  speciesId?: unknown;
  commonName?: unknown;
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
 * POST /api/h/[token]/plants — add a plant. The client sends the care fields
 * already snapshotted from Perenual (or the fallback list / manual entry);
 * from here the plant is self-contained and never re-hits Perenual.
 */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const body = await readJson<AddPlantBody>(request);
  if (!body) return apiError(400, "Invalid JSON body");

  const name = optString(body.name);
  if (!name) return apiError(400, "`name` is required");

  const speciesId =
    typeof body.speciesId === "number" && Number.isInteger(body.speciesId)
      ? body.speciesId
      : null;

  const [plant] = await db
    .insert(plants)
    .values({
      householdId: household.id,
      name,
      room: optString(body.room),
      speciesId,
      commonName: optString(body.commonName),
      avatar: optString(body.avatar),
      waterIntervalDays: optInt(body.waterIntervalDays),
      waterNote: optString(body.waterNote),
      lightNote: optString(body.lightNote),
      feedIntervalDays: optInt(body.feedIntervalDays),
      feedNote: optString(body.feedNote),
      notes: optString(body.notes),
    })
    .returning();

  if (!plant) return apiError(500, "Failed to create plant");

  return json({ plant: withStatus(plant, new Date()) }, { status: 201 });
}
