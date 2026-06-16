import { db } from "@/db";
import { plants } from "@/db/schema";
import { apiError, findHousehold, json, readJson } from "@/lib/api";
import { listPlantsWithStatus, withStatus } from "@/lib/plants";

type Params = { params: Promise<{ token: string }> };

/**
 * GET /api/h/[token]/plants — all plants for the household with computed
 * status, ordered by urgency (drives the home timeline + status dots).
 */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const plantsWithStatus = await listPlantsWithStatus(household.id);
  return json({ plants: plantsWithStatus });
}

type AddPlantBody = {
  name?: unknown;
  room?: unknown;
  speciesKey?: unknown;
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
 * already snapshotted from the local species dataset (or manual entry); from
 * here the plant is self-contained.
 */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const body = await readJson<AddPlantBody>(request);
  if (!body) return apiError(400, "Invalid JSON body");

  const name = optString(body.name);
  if (!name) return apiError(400, "`name` is required");

  const [plant] = await db
    .insert(plants)
    .values({
      householdId: household.id,
      name,
      room: optString(body.room),
      speciesKey: optString(body.speciesKey),
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
