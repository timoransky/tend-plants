import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { plants } from "@/db/schema";
import { apiError, findHousehold, json, readJson } from "@/lib/api";
import { withStatus } from "@/lib/plants";

type Params = { params: Promise<{ token: string }> };

type WaterEntry = { id?: unknown; lastWatered?: unknown };
type BatchWaterBody = { entries?: unknown };

const MAX_ENTRIES = 100;

/**
 * POST /api/h/[token]/plants/water — batch-set `lastWatered` for many plants at
 * once. One route serves three callers:
 *
 *   - "Water all" per room / multi-select: entries omit `lastWatered`, so every
 *     plant is set to a single shared `now`.
 *   - Undo: each entry carries an explicit `lastWatered` (an ISO string, or
 *     `null` for a never-watered plant) to restore the exact prior timestamp.
 *
 * Entries are deduped by id (last wins) then grouped by resolved value — the
 * all-now case collapses to one UPDATE. Foreign-household ids are silently
 * skipped (the household filter + `.returning()` only yields rows we own), which
 * is correct for undo. Returns only the rows actually updated, with recomputed
 * status so the grid can reconcile.
 */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const body = await readJson<BatchWaterBody>(request);
  if (!body || !Array.isArray(body.entries)) {
    return apiError(400, "`entries` must be an array");
  }
  const entries = body.entries as WaterEntry[];
  if (entries.length === 0) return apiError(400, "`entries` is empty");
  if (entries.length > MAX_ENTRIES) {
    return apiError(400, `Too many entries (max ${MAX_ENTRIES})`);
  }

  const now = new Date();

  // Resolve + validate each entry to a target value, deduping by id (last wins).
  // Omitting `lastWatered` means "set now"; an explicit string/null sets it
  // exactly (string must be a parseable timestamp).
  const resolved = new Map<string, Date | null>();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id) {
      return apiError(400, "Each entry needs a non-empty `id`");
    }
    let value: Date | null;
    if (!("lastWatered" in entry)) {
      value = now;
    } else if (entry.lastWatered === null) {
      value = null;
    } else if (typeof entry.lastWatered === "string") {
      const parsed = new Date(entry.lastWatered);
      if (Number.isNaN(parsed.getTime())) {
        return apiError(400, "`lastWatered` is not a valid timestamp");
      }
      value = parsed;
    } else {
      return apiError(400, "`lastWatered` must be a string or null");
    }
    resolved.set(entry.id, value);
  }

  // Group ids by their resolved value so each distinct value is one UPDATE.
  const groups = new Map<string, { value: Date | null; ids: string[] }>();
  for (const [id, value] of resolved) {
    const key = value === null ? "null" : value.toISOString();
    const group = groups.get(key);
    if (group) group.ids.push(id);
    else groups.set(key, { value, ids: [id] });
  }

  const updated = await Promise.all(
    [...groups.values()].map(({ value, ids }) =>
      db
        .update(plants)
        .set({ lastWatered: value })
        .where(
          and(
            eq(plants.householdId, household.id),
            inArray(plants.id, ids),
          ),
        )
        .returning(),
    ),
  );

  const result = updated.flat().map((p) => withStatus(p, now));
  return json({ plants: result });
}
