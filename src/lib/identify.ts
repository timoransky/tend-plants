import { FALLBACK_SPECIES } from "@/data/fallback-species";

/**
 * Server-only plant identification from a photo, powered by the Pl@ntNet API.
 *
 * Pl@ntNet is a purpose-built plant-identification service (its model is trained
 * on plants, so it beats a general vision model at exactly this task) with a
 * free tier — the cheapest option that stays accurate. It returns scientific and
 * common names rather than one of our keys, so the work here is mapping its
 * answer back onto our own {@link FALLBACK_SPECIES} dataset. As with the rest of
 * the add flow, identification never invents care data: a mapped species opens
 * its snapshotted care form; an unmapped-but-real plant drops into manual entry.
 *
 * The feature is gated behind `PLANTNET_API_KEY`: with no key set,
 * {@link isIdentifyEnabled} is false, the UI hides the entry point, and the
 * route returns 503. The key is server-side only and never reaches the browser.
 * Register for a free key at https://my.plantnet.org/.
 */

export type IdentifyCandidate = {
  /**
   * Matching key from {@link FALLBACK_SPECIES}, or "" when the plant is real but
   * not in our dataset (choosing it falls back to manual entry, name pre-filled).
   */
  speciesKey: string;
  /** Common name to show / pre-fill. */
  commonName: string;
  confidence: "high" | "medium" | "low";
};

export type IdentifyResult = {
  /**
   * Up to a few ranked candidates, best first — so the user can confirm the top
   * guess or pick a close alternative rather than being stuck with one answer.
   * Empty when nothing was confidently identified (a non-plant photo, or a plant
   * Pl@ntNet couldn't place); the client then offers another photo / manual entry.
   */
  candidates: IdentifyCandidate[];
};

/**
 * A failure the route can turn into a specific HTTP response — notably the daily
 * quota (429), which a plain "try again" 502 would misrepresent.
 */
export class IdentifyError extends Error {
  constructor(
    readonly userMessage: string,
    readonly status = 502,
  ) {
    super(userMessage);
    this.name = "IdentifyError";
  }
}

/** Whether photo identification is configured (a Pl@ntNet key is present). */
export function isIdentifyEnabled(): boolean {
  return !!process.env.PLANTNET_API_KEY;
}

// Query the global flora ("all" project) and ask for English common names so
// our (English) dataset names line up. Organs default to "auto", so we don't
// send them and let Pl@ntNet detect leaf/flower/etc.
const ENDPOINT = "https://my-api.plantnet.org/v2/identify/all";

// Below this, skip the candidate — a weak, near-random guess (Pl@ntNet already
// rejects clear non-plants with a 404).
const MIN_PLANT_SCORE = 0.05;
// How many ranked options to offer for review. More than this is just noise.
const MAX_CANDIDATES = 3;

/** Reduce a name to lowercase alphanumeric words: "Snake Plant" → ["snake","plant"]. */
function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** True when every word of `alias` appears in `candidate` (subset match). */
function isSubset(alias: string[], candidate: string[]): boolean {
  return alias.length > 0 && alias.every((w) => candidate.includes(w));
}

/**
 * Match aliases for a dataset species, as word lists. Sources: the common name,
 * its key (often the genus — monstera, philodendron, dracaena… — which matches
 * Pl@ntNet's `genus` directly), and, for names like "Air Plant (Tillandsia)",
 * the parts either side of the parentheses. Splitting the parenthetical matters:
 * the whole three-word alias rarely appears in one Pl@ntNet name, but "air
 * plant" (a common name) and "tillandsia" (the genus) each match on their own.
 */
function aliasesFor(commonName: string, key: string): string[][] {
  const sources = [commonName, key];
  const paren = commonName.match(/^([^(]+)\(([^)]+)\)/);
  if (paren) sources.push(paren[1], paren[2]);

  const seen = new Set<string>();
  const aliases: string[][] = [];
  for (const source of sources) {
    const words = tokenize(source);
    const signature = words.join(" ");
    if (words.length && !seen.has(signature)) {
      seen.add(signature);
      aliases.push(words);
    }
  }
  return aliases;
}

const DATASET = FALLBACK_SPECIES.map((s) => ({
  key: s.key,
  commonName: s.commonName,
  aliases: aliasesFor(s.commonName, s.key),
}));

type PlantNetResult = {
  score?: number;
  species?: {
    scientificNameWithoutAuthor?: string;
    genus?: { scientificNameWithoutAuthor?: string };
    commonNames?: string[];
  };
};
type PlantNetResponse = {
  results?: PlantNetResult[];
  remainingIdentificationRequests?: number;
};

/** The candidate name word-sets for one Pl@ntNet result (one set per name). */
function candidateNameSets(result: PlantNetResult): string[][] {
  const species = result.species ?? {};
  const sets = (species.commonNames ?? []).map(tokenize);
  if (species.scientificNameWithoutAuthor) {
    sets.push(tokenize(species.scientificNameWithoutAuthor));
  }
  if (species.genus?.scientificNameWithoutAuthor) {
    sets.push(tokenize(species.genus.scientificNameWithoutAuthor));
  }
  return sets;
}

/** A display name for a result: first common name, else the scientific name. */
function displayName(result: PlantNetResult): string {
  const species = result.species ?? {};
  return (
    species.commonNames?.[0] ?? species.scientificNameWithoutAuthor ?? "Plant"
  );
}

function confidenceFor(score: number): IdentifyCandidate["confidence"] {
  if (score >= 0.4) return "high";
  if (score >= 0.15) return "medium";
  return "low";
}

/**
 * Map one Pl@ntNet result to a dataset species, preferring the most specific
 * match (longest matching alias) so "Monstera adansonii" lands on
 * monstera-adansonii rather than the generic monstera. Falls back to a
 * manual-entry candidate (empty key + the result's display name) when nothing
 * in the dataset matches.
 */
function mapResultToSpecies(result: PlantNetResult): {
  speciesKey: string;
  commonName: string;
} {
  const sets = candidateNameSets(result);
  let best: (typeof DATASET)[number] | undefined;
  let bestLength = 0;
  for (const species of DATASET) {
    for (const alias of species.aliases) {
      if (
        alias.length > bestLength &&
        sets.some((cand) => isSubset(alias, cand))
      ) {
        best = species;
        bestLength = alias.length;
      }
    }
  }
  return best
    ? { speciesKey: best.key, commonName: best.commonName }
    : { speciesKey: "", commonName: displayName(result) };
}

const NO_MATCH: IdentifyResult = { candidates: [] };

/**
 * Identify the plant in an uploaded image via Pl@ntNet, then map the result to a
 * dataset species. Throws {@link IdentifyError} on service/config failures.
 */
export async function identifyPlant(image: {
  blob: Blob;
  filename: string;
}): Promise<IdentifyResult> {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    throw new IdentifyError("Photo identification is not configured.", 503);
  }

  const form = new FormData();
  form.append("images", image.blob, image.filename);

  const url = `${ENDPOINT}?api-key=${encodeURIComponent(apiKey)}&lang=en&nb-results=10`;

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: form });
  } catch {
    throw new IdentifyError(
      "Identification service is unreachable. Please try again.",
    );
  }

  // Pl@ntNet returns 404 when it can't match a plant at all (incl. non-plants).
  if (res.status === 404) return NO_MATCH;
  if (res.status === 429) {
    throw new IdentifyError(
      "Daily identification limit reached. Please try again tomorrow.",
      429,
    );
  }
  // 401 = bad/absent key: a server misconfiguration, not the user's problem.
  if (!res.ok) {
    throw new IdentifyError("Identification failed. Please try again.");
  }

  let data: PlantNetResponse;
  try {
    data = (await res.json()) as PlantNetResponse;
  } catch {
    throw new IdentifyError("Identification failed. Please try again.");
  }

  const results = (data.results ?? []).filter((r) => r.species);

  // Build up to MAX_CANDIDATES ranked options (Pl@ntNet returns them sorted by
  // score, desc). Each result maps to a dataset species when its names match,
  // else becomes a manual-entry candidate keyed by name. Dedupe so two Pl@ntNet
  // species that resolve to the same option don't both appear.
  const candidates: IdentifyCandidate[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    const score = result.score ?? 0;
    if (score < MIN_PLANT_SCORE) break; // sorted, so the rest are weaker still
    const mapped = mapResultToSpecies(result);
    const dedupeKey =
      mapped.speciesKey || `name:${mapped.commonName.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    candidates.push({ ...mapped, confidence: confidenceFor(score) });
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  return { candidates };
}
