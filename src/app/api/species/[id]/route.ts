import { apiError, json } from "@/lib/api";
import { fallbackDetail, getSpeciesCareDetail } from "@/lib/perenual";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/species/[id] — proxy a single species' care detail (key hidden).
 * `id` is a numeric Perenual id, or a fallback key string for local entries.
 * On a Perenual failure for a numeric id, fall back to the local list by name.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const numericId = Number(id);

  // Non-numeric id → a local fallback entry keyed by string.
  if (!Number.isInteger(numericId)) {
    const detail = fallbackDetail(id);
    if (!detail) return apiError(404, "Species not found");
    return json({ source: "fallback", species: detail });
  }

  try {
    const species = await getSpeciesCareDetail(numericId);
    return json({ source: "perenual", species });
  } catch {
    return apiError(
      502,
      "Species care detail is unavailable; use manual entry or the fallback list",
    );
  }
}
