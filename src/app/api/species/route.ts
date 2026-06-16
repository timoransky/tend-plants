import type { NextRequest } from "next/server";

import { json } from "@/lib/api";
import { fallbackSearch, searchSpecies } from "@/lib/perenual";

/**
 * GET /api/species?q=<name>&page=<n> — proxy Perenual species search so the
 * key stays server-side. Empty `q` returns the common-species first page. If
 * Perenual is down (or returns nothing), fall back to the local species list.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  try {
    const results = await searchSpecies(q, page);
    if (results.length > 0) {
      return json({ source: "perenual", page, results });
    }
    // Perenual succeeded but had no matches — offer the local list instead.
    return json({ source: "fallback", page: 1, results: fallbackSearch(q) });
  } catch {
    return json({ source: "fallback", page: 1, results: fallbackSearch(q) });
  }
}
