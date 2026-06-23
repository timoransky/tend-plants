import { eq } from "drizzle-orm";

import { db } from "@/db";
import { households } from "@/db/schema";
import { apiError, findHousehold, json, readJson } from "@/lib/api";

type Params = { params: Promise<{ token: string }> };

type EditBody = {
  name?: unknown;
  avatar?: unknown;
};

function optString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

/**
 * PATCH /api/h/[token] — edit a household's display fields. Only the fields
 * present in the body change: `name` (empty clears it, falling back to the
 * word-pair code) and `avatar` (empty clears it, falling back to a house glyph).
 * The token stays the capability: only its holder can edit it.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

  const body = await readJson<EditBody>(request);
  if (!body) return apiError(400, "Invalid JSON body");

  const updates: Partial<typeof households.$inferInsert> = {};
  if ("name" in body) updates.name = optString(body.name);
  if ("avatar" in body) updates.avatar = optString(body.avatar);

  if (Object.keys(updates).length === 0) {
    return apiError(400, "No editable fields provided");
  }

  const [updated] = await db
    .update(households)
    .set(updates)
    .where(eq(households.id, household.id))
    .returning();

  if (!updated) return apiError(500, "Failed to update household");
  return json({ household: updated });
}
