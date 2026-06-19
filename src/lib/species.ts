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

function toDetail(s: (typeof FALLBACK_SPECIES)[number]): SpeciesDetail {
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

function matchSpecies(q: string) {
  const needle = q.trim().toLowerCase();
  return needle
    ? FALLBACK_SPECIES.filter((s) =>
        s.commonName.toLowerCase().includes(needle),
      )
    : FALLBACK_SPECIES;
}

/**
 * Search/browse the local dataset by name. Substring match on `commonName`;
 * an empty query returns the whole list.
 */
export function searchSpecies(q: string): SpeciesSummary[] {
  return matchSpecies(q).map((s) => ({
    key: s.key,
    commonName: s.commonName,
    avatar: s.avatar,
    waterIntervalDays: s.waterIntervalDays,
    lightNote: s.lightNote,
  }));
}

/**
 * Like {@link searchSpecies} but returns full care detail per match. The
 * add-plant picker uses this so selecting a species needs no extra round-trip —
 * the dataset is tiny and local, so shipping every field up front is cheaper
 * than a follow-up fetch per pick.
 */
export function searchSpeciesDetail(q: string): SpeciesDetail[] {
  return matchSpecies(q).map(toDetail);
}

/** Look up a single species' full care detail by its key. */
export function getSpecies(key: string): SpeciesDetail | null {
  const s = FALLBACK_SPECIES.find((x) => x.key === key);
  return s ? toDetail(s) : null;
}
