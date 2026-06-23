import { eq } from "drizzle-orm";

import { db } from "@/db";
import { households, type Household } from "@/db/schema";
import { generateDisplayCode } from "@/lib/household-code";

/** JSON success response. */
export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/** JSON error response with a consistent `{ error }` shape. */
export function apiError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Resolve a household by its token. Every route under `/api/h/[token]` calls
 * this first: the token is the capability, so an unknown token is a 404 and no
 * data is ever returned for it. Callers then filter all queries by
 * `household.id`.
 */
export async function findHousehold(token: string): Promise<Household | null> {
  if (!token) return null;
  const rows = await db
    .select()
    .from(households)
    .where(eq(households.id, token))
    .limit(1);
  const household = rows[0];
  if (!household) return null;

  // Self-heal households created before display codes existed: assign one on
  // first access so every household gets a stable, friendly label with no
  // manual backfill. Fires at most once per legacy row.
  if (!household.displayCode) {
    const [updated] = await db
      .update(households)
      .set({ displayCode: generateDisplayCode() })
      .where(eq(households.id, household.id))
      .returning();
    return updated ?? household;
  }

  return household;
}

/** Parse a JSON request body, returning null on empty/invalid bodies. */
export async function readJson<T = unknown>(
  request: Request,
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
