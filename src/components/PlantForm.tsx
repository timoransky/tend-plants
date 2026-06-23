"use client";

import { useMemo, useState } from "react";

import { DrawerDescription, DrawerTitle } from "@/components/Drawer";
import { SHOW_FEED } from "@/lib/features";
import type { SpeciesDetail } from "@/lib/species";
import { tapScale } from "@/lib/ui";

const AVATAR_CHOICES = ["🌿", "🪴", "🌵", "🌱", "🌴", "🍃", "🌸", "🌼", "🌺"];

/** The full set of editable fields, kept as strings for controlled inputs. */
export type PlantFormValues = {
  name: string;
  room: string;
  avatar: string;
  waterIntervalDays: string;
  waterNote: string;
  lightNote: string;
  feedIntervalDays: string;
  feedNote: string;
  notes: string;
};

/** Species-derived fields — the ones "reset to defaults" restores. Room and
 * personal notes are user-only and deliberately excluded. */
const SPECIES_KEYS = [
  "name",
  "avatar",
  "waterIntervalDays",
  "waterNote",
  "lightNote",
  "feedIntervalDays",
  "feedNote",
] as const satisfies readonly (keyof PlantFormValues)[];

/** Seed form values from a species (for the add flow's initial state). */
export function speciesToValues(s: SpeciesDetail): PlantFormValues {
  return {
    name: s.commonName,
    room: "",
    avatar: s.avatar,
    waterIntervalDays: String(s.waterIntervalDays),
    waterNote: s.waterNote,
    lightNote: s.lightNote,
    feedIntervalDays: String(s.feedIntervalDays),
    feedNote: s.feedNote,
    notes: "",
  };
}

/** Empty defaults for a manual (non-species) entry. */
export const MANUAL_VALUES: PlantFormValues = {
  name: "",
  room: "",
  avatar: "🪴",
  waterIntervalDays: "7",
  waterNote: "",
  lightNote: "",
  feedIntervalDays: "30",
  feedNote: "",
  notes: "",
};

/**
 * The shared plant care form: name, room, avatar, water/light/feed and personal
 * notes. Reused by both the add flow (seeded from a species or blank, POSTs a
 * new plant) and the edit sheet (seeded from an existing plant, PATCHes it).
 *
 * Owns its own field/submitting/error state; the caller supplies `onSubmit`,
 * which does the network write (and may throw to surface an inline error). When
 * a `species` is given, a "reset to defaults" control restores the
 * species-derived fields (leaving room/notes untouched).
 *
 * Renders the drawer header (the live avatar circle + `title`/`subtitle`),
 * which doubles as vaul's required `DrawerTitle`, so it must be rendered inside
 * an open `<Drawer>`.
 */
export function PlantForm({
  initial,
  species,
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  onSubmit,
}: {
  initial: PlantFormValues;
  species: SpeciesDetail | null;
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: PlantFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<PlantFormValues>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<PlantFormValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  const defaults = useMemo(
    () => (species ? speciesToValues(species) : null),
    [species],
  );

  const isDirty = useMemo(() => {
    if (!defaults) return false;
    return SPECIES_KEYS.some((k) => defaults[k] !== values[k]);
  }, [defaults, values]);

  function resetToDefaults() {
    if (!defaults) return;
    const patch: Partial<PlantFormValues> = {};
    for (const k of SPECIES_KEYS) patch[k] = defaults[k];
    set(patch);
  }

  // Stable avatar palette: the standard choices, plus the seeded avatar and the
  // species' own emoji if they aren't already among them — so an existing or
  // species-specific emoji shows up (and highlights) without the row reshuffling
  // as the user taps around.
  const avatarChoices = useMemo(() => {
    const extras = [initial.avatar, species?.avatar].filter(
      (a): a is string => !!a && !AVATAR_CHOICES.includes(a),
    );
    return [...new Set([...extras, ...AVATAR_CHOICES])];
  }, [initial.avatar, species]);

  async function submit() {
    const name = values.name.trim();
    if (!name) {
      setError("Please give your plant a name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ ...values, name });
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-4 pb-5">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-muted text-4xl">
          <span aria-hidden>{values.avatar || "🪴"}</span>
        </span>
        <div className="min-w-0">
          <DrawerTitle className="truncate text-2xl font-semibold tracking-tight text-ink">
            {title}
          </DrawerTitle>
          <DrawerDescription className="truncate text-sm text-ink-soft">
            {subtitle}
          </DrawerDescription>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Monty"
            className="input"
          />
        </Field>

        <Field label="Room">
          <input
            value={values.room}
            onChange={(e) => set({ room: e.target.value })}
            placeholder="e.g. Living Room"
            className="input"
          />
        </Field>

        <Field label="Avatar">
          <div className="flex flex-wrap gap-1.5">
            {avatarChoices.map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => set({ avatar: emo })}
                className={`flex size-10 items-center justify-center rounded-xl text-xl ${tapScale} ${
                  values.avatar === emo
                    ? "bg-healthy/20 ring-2 ring-healthy"
                    : "bg-surface-muted hover:bg-surface-muted/70"
                }`}
              >
                {emo}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between border-t border-ink/10 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Care
          </h2>
          {species ? (
            <button
              type="button"
              onClick={resetToDefaults}
              disabled={!isDirty}
              className="text-xs font-medium text-healthy-ink transition-opacity disabled:opacity-40"
            >
              ↺ Reset to {species.commonName} defaults
            </button>
          ) : null}
        </div>

        <Field label="Water — every (days)" accent="text-water-ink">
          <input
            type="number"
            min={1}
            value={values.waterIntervalDays}
            onChange={(e) => set({ waterIntervalDays: e.target.value })}
            className="input tabular-nums"
          />
        </Field>
        <Field label="Watering note" accent="text-water-ink">
          <textarea
            value={values.waterNote}
            onChange={(e) => set({ waterNote: e.target.value })}
            rows={2}
            placeholder="When to water…"
            className="input resize-none"
          />
        </Field>

        <Field label="Light" accent="text-light-ink">
          <textarea
            value={values.lightNote}
            onChange={(e) => set({ lightNote: e.target.value })}
            rows={2}
            placeholder="Light preference…"
            className="input resize-none"
          />
        </Field>

        {SHOW_FEED ? (
          <>
            <Field label="Feed — every (days)" accent="text-feed-ink">
              <input
                type="number"
                min={1}
                value={values.feedIntervalDays}
                onChange={(e) => set({ feedIntervalDays: e.target.value })}
                className="input tabular-nums"
              />
            </Field>
            <Field label="Feeding note" accent="text-feed-ink">
              <textarea
                value={values.feedNote}
                onChange={(e) => set({ feedNote: e.target.value })}
                rows={2}
                placeholder="How to feed…"
                className="input resize-none"
              />
            </Field>
          </>
        ) : null}

        <Field label="Your notes">
          <textarea
            value={values.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={2}
            placeholder="Anything personal to remember…"
            className="input resize-none"
          />
        </Field>
      </div>

      {error ? <p className="pt-4 text-sm text-water-ink">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !values.name.trim()}
        className={`mt-4 h-12 w-full rounded-full bg-healthy text-base font-semibold text-canvas ${tapScale} hover:bg-healthy/90 disabled:opacity-60`}
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </>
  );
}

function Field({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className={`text-xs font-medium uppercase tracking-wide ${accent ?? "text-ink-soft"}`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
