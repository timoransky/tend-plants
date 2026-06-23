import { nanoid } from "nanoid";

import { db } from "@/db";
import { households } from "@/db/schema";
import { apiError, json, readJson } from "@/lib/api";
import { generateDisplayCode } from "@/lib/household-code";

type CreateHouseholdBody = {
  name?: string;
};

/**
 * POST /api/household — create a household and return its token.
 * The token (nanoid, 21 chars) is the capability: it goes in the `/h/<token>`
 * URL and grants full access. No auth.
 */
export async function POST(request: Request) {
  const body = (await readJson<CreateHouseholdBody>(request)) ?? {};

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : null;

  const id = nanoid();
  const displayCode = generateDisplayCode();
  const [household] = await db
    .insert(households)
    .values({ id, name, displayCode })
    .returning();

  if (!household) {
    return apiError(500, "Failed to create household");
  }

  return json({ household }, { status: 201 });
}
