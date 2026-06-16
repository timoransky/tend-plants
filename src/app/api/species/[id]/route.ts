import { apiError, json } from "@/lib/api";
import { getSpecies } from "@/lib/species";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/species/[id] — care detail for a single species. `id` is the
 * kebab-case key from the local dataset; unknown keys are a 404.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const species = getSpecies(id);
  if (!species) return apiError(404, "Species not found");
  return json({ species });
}
