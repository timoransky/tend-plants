import { FALLBACK_SPECIES, type FallbackSpecies } from "@/data/fallback-species";

/**
 * Server-side Perenual client. Only ever called while *adding* a plant (the
 * free tier is capped at 100 req/day), never on the render path. The API key
 * lives server-side and is injected here; callers proxy these through route
 * handlers so the browser never sees it.
 */

const BASE_URL = "https://perenual.com/api/v2";

export class PerenualError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PerenualError";
  }
}

/**
 * Perenual watering is often qualitative ("Frequent" / "Average" / "Minimum")
 * rather than a clean day count. Map it to an interval, preferring the numeric
 * `watering_general_benchmark` when present.
 */
const QUALITATIVE_WATERING_DAYS: Record<string, number> = {
  frequent: 5,
  average: 7,
  minimum: 14,
  none: 21,
};

const DEFAULT_WATER_INTERVAL_DAYS = 7;

export function mapWateringToInterval(
  watering: string | null | undefined,
  benchmark?: { value?: string | number | null; unit?: string | null } | null,
): number {
  // Prefer the numeric benchmark when it's expressed in days.
  if (benchmark && benchmark.value != null) {
    const unit = (benchmark.unit ?? "").toLowerCase();
    // Benchmark values can be a single number or a "5-7" range string.
    const first = String(benchmark.value).split(/[-–]/)[0]?.trim();
    const n = Number(first);
    if (Number.isFinite(n) && n > 0 && unit.includes("day")) {
      return Math.round(n);
    }
  }
  const key = (watering ?? "").trim().toLowerCase();
  return QUALITATIVE_WATERING_DAYS[key] ?? DEFAULT_WATER_INTERVAL_DAYS;
}

export type NormalizedSpecies = {
  /** Perenual species id, or a fallback key string for local entries. */
  id: number | string;
  source: "perenual" | "fallback";
  commonName: string;
  scientificName: string | null;
  avatar: string;
  image: string | null;
  /** Suggested, editable watering interval in days. */
  waterIntervalDays: number;
  lightNote: string | null;
};

export type NormalizedSpeciesDetail = NormalizedSpecies & {
  waterNote: string | null;
  feedNote: string | null;
};

function requireKey(): string {
  const key = process.env.PERENUAL_API_KEY;
  if (!key) throw new PerenualError("PERENUAL_API_KEY is not set");
  return key;
}

async function perenualFetch(path: string, params: Record<string, string>) {
  const key = requireKey();
  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== "") url.searchParams.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (e) {
    throw new PerenualError(`Perenual request failed: ${String(e)}`);
  }
  if (!res.ok) {
    throw new PerenualError(`Perenual returned ${res.status}`);
  }
  return res.json();
}

function sunlightToNote(sunlight: unknown): string | null {
  if (Array.isArray(sunlight) && sunlight.length > 0) {
    return sunlight.map((s) => String(s)).join(", ");
  }
  return null;
}

const SPECIES_EMOJI = "🪴";

/**
 * Search/browse species. Empty `q` returns the common-species first page.
 * Throws PerenualError on failure so the caller can fall back to the local list.
 */
export async function searchSpecies(
  q: string,
  page: number,
): Promise<NormalizedSpecies[]> {
  const data = await perenualFetch("species-list", {
    q,
    page: String(page),
  });

  const items: unknown[] = Array.isArray(data?.data) ? data.data : [];
  return items.map((raw): NormalizedSpecies => {
    const item = raw as Record<string, unknown>;
    const image = (item.default_image as Record<string, unknown> | null)
      ?.thumbnail as string | undefined;
    return {
      id: (item.id as number) ?? 0,
      source: "perenual",
      commonName:
        (item.common_name as string) ??
        (Array.isArray(item.scientific_name)
          ? (item.scientific_name[0] as string)
          : "Unknown"),
      scientificName: Array.isArray(item.scientific_name)
        ? (item.scientific_name[0] as string)
        : ((item.scientific_name as string) ?? null),
      avatar: SPECIES_EMOJI,
      image: image ?? null,
      waterIntervalDays: mapWateringToInterval(
        item.watering as string | undefined,
        item.watering_general_benchmark as
          | { value?: string; unit?: string }
          | undefined,
      ),
      lightNote: sunlightToNote(item.sunlight),
    };
  });
}

/**
 * Care detail for a single species, built from the care-guide sections.
 * Throws PerenualError on failure so the caller can fall back.
 */
export async function getSpeciesCareDetail(
  id: number,
): Promise<NormalizedSpeciesDetail> {
  const data = await perenualFetch("species-care-guide-list", {
    species_id: String(id),
  });

  const guide = (Array.isArray(data?.data) ? data.data[0] : null) as Record<
    string,
    unknown
  > | null;
  if (!guide) {
    throw new PerenualError(`No care guide for species ${id}`);
  }

  const sections: Array<Record<string, unknown>> = Array.isArray(guide.section)
    ? (guide.section as Array<Record<string, unknown>>)
    : [];
  const sectionText = (type: string): string | null => {
    const s = sections.find(
      (x) => String(x.type).toLowerCase() === type.toLowerCase(),
    );
    const desc = s?.description;
    return typeof desc === "string" && desc.trim() ? desc.trim() : null;
  };

  return {
    id,
    source: "perenual",
    commonName: (guide.common_name as string) ?? "Unknown",
    scientificName: Array.isArray(guide.scientific_name)
      ? (guide.scientific_name[0] as string)
      : ((guide.scientific_name as string) ?? null),
    avatar: SPECIES_EMOJI,
    image: null,
    // Care-guide-list doesn't return a benchmark; interval is refined from the
    // search list item. Default here keeps the detail self-sufficient.
    waterIntervalDays: DEFAULT_WATER_INTERVAL_DAYS,
    waterNote: sectionText("watering"),
    lightNote: sectionText("sunlight"),
    feedNote: null,
  };
}

// --- Local fallback list ---------------------------------------------------

function fallbackToNormalized(s: FallbackSpecies): NormalizedSpecies {
  return {
    id: s.key,
    source: "fallback",
    commonName: s.commonName,
    scientificName: null,
    avatar: s.avatar,
    image: null,
    waterIntervalDays: s.waterIntervalDays,
    lightNote: s.lightNote,
  };
}

/** Local list filtered by query — used when Perenual is down or empty. */
export function fallbackSearch(q: string): NormalizedSpecies[] {
  const needle = q.trim().toLowerCase();
  const matches = needle
    ? FALLBACK_SPECIES.filter((s) =>
        s.commonName.toLowerCase().includes(needle),
      )
    : FALLBACK_SPECIES;
  return matches.map(fallbackToNormalized);
}

/** Look up a fallback entry by its key and return full care detail. */
export function fallbackDetail(key: string): NormalizedSpeciesDetail | null {
  const s = FALLBACK_SPECIES.find((x) => x.key === key);
  if (!s) return null;
  return {
    ...fallbackToNormalized(s),
    waterNote: s.waterNote,
    feedNote: s.feedNote,
  };
}
