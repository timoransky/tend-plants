import type { NextRequest } from "next/server";

import { json } from "@/lib/api";
import { searchSpecies } from "@/lib/species";

/**
 * GET /api/species?q=<name> — search/browse the local species dataset.
 * Substring match on the common name; an empty `q` returns the full list.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  return json({ results: searchSpecies(q) });
}
