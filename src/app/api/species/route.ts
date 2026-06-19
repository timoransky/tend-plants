import type { NextRequest } from "next/server";

import { json } from "@/lib/api";
import { searchSpeciesDetail } from "@/lib/species";

/**
 * GET /api/species?q=<name> — search/browse the local species dataset.
 * Substring match on the common name; an empty `q` returns the full list.
 * Each result carries full care detail so the add-plant picker can open a
 * species' form without a follow-up fetch.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  return json({ results: searchSpeciesDetail(q) });
}
