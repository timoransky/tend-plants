import { FALLBACK_SPECIES } from "@/data/fallback-species";

/**
 * Local-only species lookup over the curated dataset (`@/data/fallback-species`).
 * No network: the add-plant flow browses/searches this list and snapshots the
 * chosen entry's care fields into a new `plants` row. There is no external care
 * API — the local dataset is the source of truth and the app works offline.
 */

/** Lightweight shape for search/browse results. */
export type SpeciesSummary = {
  key: string;
  commonName: string;
  avatar: string;
  waterIntervalDays: number;
  lightNote: string;
};

/** Full care detail for a single species. */
export type SpeciesDetail = SpeciesSummary & {
  waterNote: string;
  feedIntervalDays: number;
  feedNote: string;
};

/**
 * Search/browse the local dataset by name. Substring match on `commonName`;
 * an empty query returns the whole list.
 */
export function searchSpecies(q: string): SpeciesSummary[] {
  const needle = q.trim().toLowerCase();
  const matches = needle
    ? FALLBACK_SPECIES.filter((s) =>
        s.commonName.toLowerCase().includes(needle),
      )
    : FALLBACK_SPECIES;
  return matches.map((s) => ({
    key: s.key,
    commonName: s.commonName,
    avatar: s.avatar,
    waterIntervalDays: s.waterIntervalDays,
    lightNote: s.lightNote,
  }));
}

/** Look up a single species' full care detail by its key. */
export function getSpecies(key: string): SpeciesDetail | null {
  const s = FALLBACK_SPECIES.find((x) => x.key === key);
  if (!s) return null;
  return {
    key: s.key,
    commonName: s.commonName,
    avatar: s.avatar,
    waterIntervalDays: s.waterIntervalDays,
    lightNote: s.lightNote,
    waterNote: s.waterNote,
    feedIntervalDays: s.feedIntervalDays,
    feedNote: s.feedNote,
  };
}
