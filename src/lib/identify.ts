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

export type IdentifyResult = {
  /**
   * False when nothing was confidently identified (a non-plant photo, or a plant
   * Pl@ntNet couldn't place). The client then prompts for another photo.
   */
  isPlant: boolean;
  /**
   * Matching key from {@link FALLBACK_SPECIES}, or "" when the plant is real but
   * not in our dataset (the caller falls back to manual entry, name pre-filled).
   */
  speciesKey: string;
  /** Common name to show / pre-fill, even when the plant isn't in the dataset. */
  commonName: string;
  confidence: "high" | "medium" | "low";
  /** One short line about the identification (kept for future UI use). */
  note: string;
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

// Below this, treat the photo as "no confident plant" (Pl@ntNet already rejects
// clear non-plants with a 404; this catches weak, near-random guesses).
const MIN_PLANT_SCORE = 0.05;
// Only snap a result onto a dataset species when it's at least this confident.
const MIN_MAP_SCORE = 0.1;

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

function confidenceFor(score: number): IdentifyResult["confidence"] {
  if (score >= 0.4) return "high";
  if (score >= 0.15) return "medium";
  return "low";
}

const NO_MATCH: IdentifyResult = {
  isPlant: false,
  speciesKey: "",
  commonName: "",
  confidence: "low",
  note: "No confident match.",
};

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
  const top = results[0];
  if (!top || (top.score ?? 0) < MIN_PLANT_SCORE) return NO_MATCH;

  // Scan results (already sorted by score, desc) and snap onto the first that
  // maps to a dataset species, above the mapping floor. `break` at the floor is
  // safe because the list is sorted. Within a result, prefer the most specific
  // match — the longest matching alias — so "Monstera adansonii" lands on
  // monstera-adansonii rather than the generic monstera.
  let matched: (typeof DATASET)[number] | undefined;
  let matchedResult = top;
  for (const result of results) {
    if ((result.score ?? 0) < MIN_MAP_SCORE) break;
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
    if (best) {
      matched = best;
      matchedResult = result;
      break;
    }
  }

  const name = matched ? matched.commonName : displayName(top);
  const score = (matched ? matchedResult.score : top.score) ?? 0;

  return {
    isPlant: true,
    speciesKey: matched?.key ?? "",
    commonName: name,
    confidence: confidenceFor(score),
    note: `Pl@ntNet matched this as ${name} (${Math.round(score * 100)}% match).`,
  };
}
