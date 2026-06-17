import { eq } from "drizzle-orm";

import { db } from "@/db";
import { plants } from "@/db/schema";
import { findHousehold } from "@/lib/api";
import { seedEnabled } from "@/lib/seed";
import { getSpecies, searchSpecies } from "@/lib/species";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const ROOMS: (string | null)[] = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Office",
  null, // → "Everywhere else"
];
const DAY = 86_400_000;

/**
 * GET /api/h/[token]/seed — dev convenience: fill a household with sample plants
 * (snapshotted from the local species dataset), spread across a few rooms with
 * randomized last-watered dates so statuses vary, then redirect home.
 *
 * Query params:
 *   ?count=N   how many plants (1–30, default 10)
 *   ?reset=1   delete the household's existing plants first
 *
 * Disabled in production unless ENABLE_SEED=1 (see lib/seed).
 */
export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  if (!seedEnabled()) return new Response("Not found", { status: 404 });

  const household = await findHousehold(token);
  if (!household) return new Response("Household not found", { status: 404 });

  const url = new URL(request.url);
  const count = Math.min(
    Math.max(Math.trunc(Number(url.searchParams.get("count")) || 10), 1),
    30,
  );
  const reset = ["1", "true", "yes"].includes(
    (url.searchParams.get("reset") ?? "").toLowerCase(),
  );

  if (reset) {
    await db.delete(plants).where(eq(plants.householdId, household.id));
  }

  // Shuffle the dataset (route handler — Math.random is fine here) and take
  // `count`, cycling if asked for more than the dataset holds.
  const pool = [...searchSpecies("")].sort(() => Math.random() - 0.5);
  const now = Date.now();

  const rows = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const sp = getSpecies(pool[i % pool.length].key);
    if (!sp) continue;

    // Vary last-watered so the household shows a mix of fine / due / overdue;
    // ~1 in 5 has never been watered (overdue from the start).
    const lastWatered =
      Math.random() < 0.2
        ? null
        : new Date(now - Math.random() * sp.waterIntervalDays * 1.4 * DAY);

    rows.push({
      householdId: household.id,
      name: sp.commonName,
      room: ROOMS[i % ROOMS.length],
      speciesKey: sp.key,
      commonName: sp.commonName,
      avatar: sp.avatar,
      lastWatered,
      waterIntervalDays: sp.waterIntervalDays,
      waterNote: sp.waterNote,
      lightNote: sp.lightNote,
      feedIntervalDays: sp.feedIntervalDays,
      feedNote: sp.feedNote,
      notes: null,
    });
  }

  if (rows.length) await db.insert(plants).values(rows);

  return Response.redirect(new URL(`/h/${token}`, request.url), 302);
}
