import { and, asc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { plants } from "@/db/schema";

/**
 * Room helpers — server-only (touches the db), so kept apart from the
 * client-safe `room-icon.ts`. There's no rooms table: a "room" is just the free
 * text on plants, so the existing distinct values ARE the room list.
 */

/** Distinct non-null room names for a household, alphabetical. */
export async function listRooms(householdId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ room: plants.room })
    .from(plants)
    .where(and(eq(plants.householdId, householdId), isNotNull(plants.room)))
    .orderBy(asc(plants.room));
  return rows
    .map((r) => r.room)
    .filter((r): r is string => r !== null);
}

/**
 * Normalise a room name against the household's existing rooms so typos and
 * casing don't spawn near-duplicates. Trims + collapses inner whitespace, then
 * case-insensitively reuses an existing room's canonical casing ("living room"
 * → "Living Room" when that exists). Empty input → null.
 *
 * Identity is case-only: diacritics are NOT folded (kúpeľňa ≠ kupelna), so
 * genuinely different rooms stay distinct — only the icon matcher folds accents.
 */
export async function normalizeRoom(
  householdId: string,
  input: unknown,
): Promise<string | null> {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  const existing = await listRooms(householdId);
  const match = existing.find(
    (r) => r.toLowerCase() === cleaned.toLowerCase(),
  );
  return match ?? cleaned;
}
