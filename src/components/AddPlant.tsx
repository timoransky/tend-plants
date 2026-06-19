"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";
import { SHOW_FEED } from "@/lib/features";
import type { SpeciesDetail } from "@/lib/species";

const AVATAR_CHOICES = ["🌿", "🪴", "🌵", "🌱", "🌴", "🍃", "🌸", "🌼", "🌺"];

const MANUAL_DEFAULTS = {
  avatar: "🪴",
  waterIntervalDays: 7,
  waterNote: "",
  lightNote: "",
  feedIntervalDays: 30,
  feedNote: "",
};

/** The editable, species-derived part of the form (what "reset to original"
 * restores). Room and personal notes are user-only and excluded. */
type CareForm = {
  name: string;
  avatar: string;
  waterIntervalDays: string; // kept as string for controlled number inputs
  waterNote: string;
  lightNote: string;
  feedIntervalDays: string;
  feedNote: string;
};

function formFromSpecies(s: SpeciesDetail): CareForm {
  return {
    name: s.commonName,
    avatar: s.avatar,
    waterIntervalDays: String(s.waterIntervalDays),
    waterNote: s.waterNote,
    lightNote: s.lightNote,
    feedIntervalDays: String(s.feedIntervalDays),
    feedNote: s.feedNote,
  };
}

/**
 * The add-plant screen: the species picker stays on the page, and tapping a
 * species (or "add manually") opens its care form in a drawer. Closing the
 * drawer drops the user straight back on the picker — with their search and
 * scroll intact — so choosing a different plant is one tap, not a round-trip
 * home. The picker keeps the page's dark canvas styling; the form lives on the
 * drawer's cream surface (shared <Drawer> with the plant-detail sheet).
 */
export function AddPlant({ token }: { token: string }) {
  const router = useRouter();

  // --- Picker (page) data ---
  // The list carries full care detail, so picking a species opens its form with
  // no extra round-trip (the dataset is small and local).
  const [list, setList] = useState<SpeciesDetail[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/species")
      .then((r) => r.json())
      .then((d) => {
        if (active) setList(d.results ?? []);
      })
      .catch(() => active && setList([]));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!list) return [];
    const needle = query.trim().toLowerCase();
    return needle
      ? list.filter((s) => s.commonName.toLowerCase().includes(needle))
      : list;
  }, [list, query]);

  // --- Form (drawer) data ---
  // `original` is the species the form was seeded from (null for manual entry).
  // `formOpen` drives the drawer; `form` persists through the close animation.
  const [formOpen, setFormOpen] = useState(false);
  const [original, setOriginal] = useState<SpeciesDetail | null>(null);
  const [form, setForm] = useState<CareForm | null>(null);
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronous: the picker already holds full care detail, so opening the form
  // is just a state swap — no fetch, no loading flash.
  function pickSpecies(species: SpeciesDetail) {
    setOriginal(species);
    setForm(formFromSpecies(species));
    setRoom("");
    setNotes("");
    setSubmitting(false);
    setError(null);
    setFormOpen(true);
  }

  function startManual() {
    setOriginal(null);
    setForm({
      name: "",
      ...MANUAL_DEFAULTS,
      waterIntervalDays: "7",
      feedIntervalDays: "30",
    } as CareForm);
    setRoom("");
    setNotes("");
    setError(null);
    setSubmitting(false);
    setFormOpen(true);
  }

  const isDirty = useMemo(() => {
    if (!original || !form) return false;
    const o = formFromSpecies(original);
    return (Object.keys(o) as (keyof CareForm)[]).some((k) => o[k] !== form[k]);
  }, [original, form]);

  // Stable avatar palette: the standard choices, plus the species' own emoji if
  // it isn't already one of them. Depends only on the picked species, so
  // selecting a different emoji highlights it in place without reordering.
  const avatarChoices = useMemo(() => {
    const base = original?.avatar;
    return base && !AVATAR_CHOICES.includes(base)
      ? [base, ...AVATAR_CHOICES]
      : AVATAR_CHOICES;
  }, [original]);

  function resetToOriginal() {
    if (original) setForm(formFromSpecies(original));
  }

  async function submit() {
    if (!form) return;
    const name = form.name.trim();
    if (!name) {
      setError("Please give your plant a name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/h/${token}/plants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          room: room.trim() || null,
          avatar: form.avatar,
          speciesKey: original?.key ?? null,
          commonName: original?.commonName ?? null,
          waterIntervalDays: Number(form.waterIntervalDays) || null,
          waterNote: form.waterNote.trim() || null,
          lightNote: form.lightNote.trim() || null,
          feedIntervalDays: Number(form.feedIntervalDays) || null,
          feedNote: form.feedNote.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      router.push(`/h/${token}`);
      router.refresh();
    } catch {
      setError("Couldn't add the plant. Please try again.");
      setSubmitting(false);
    }
  }

  const set = (patch: Partial<CareForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <>
      <PickStage
        token={token}
        list={list}
        filtered={filtered}
        query={query}
        setQuery={setQuery}
        onPick={pickSpecies}
        onManual={startManual}
        error={!formOpen ? error : null}
      />

      <Drawer open={formOpen} onOpenChange={setFormOpen}>
        {form ? (
          <>
            <header className="flex items-center gap-4 pb-5">
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-muted text-4xl">
                <span aria-hidden>{form.avatar || "🪴"}</span>
              </span>
              <div className="min-w-0">
                <DrawerTitle className="truncate text-2xl font-semibold tracking-tight text-ink">
                  {original ? original.commonName : "New plant"}
                </DrawerTitle>
                <DrawerDescription className="truncate text-sm text-ink-soft">
                  Set the name, room and care details
                </DrawerDescription>
              </div>
            </header>

            <div className="flex flex-col gap-4">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. Monty"
                  className="input"
                />
              </Field>

              <Field label="Room">
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
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
                      className={`flex size-10 items-center justify-center rounded-xl text-xl transition-colors ${
                        form.avatar === emo
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
                {original ? (
                  <button
                    type="button"
                    onClick={resetToOriginal}
                    disabled={!isDirty}
                    className="text-xs font-medium text-healthy-ink transition-opacity disabled:opacity-40"
                  >
                    ↺ Reset to {original.commonName} defaults
                  </button>
                ) : null}
              </div>

              <Field label="Water — every (days)" accent="text-water-ink">
                <input
                  type="number"
                  min={1}
                  value={form.waterIntervalDays}
                  onChange={(e) => set({ waterIntervalDays: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Watering note" accent="text-water-ink">
                <textarea
                  value={form.waterNote}
                  onChange={(e) => set({ waterNote: e.target.value })}
                  rows={2}
                  placeholder="When to water…"
                  className="input resize-none"
                />
              </Field>

              <Field label="Light" accent="text-light-ink">
                <textarea
                  value={form.lightNote}
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
                      value={form.feedIntervalDays}
                      onChange={(e) =>
                        set({ feedIntervalDays: e.target.value })
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="Feeding note" accent="text-feed-ink">
                    <textarea
                      value={form.feedNote}
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything personal to remember…"
                  className="input resize-none"
                />
              </Field>
            </div>

            {error ? (
              <p className="pt-4 text-sm text-water-ink">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !form.name.trim()}
              className="mt-4 h-12 w-full rounded-full bg-healthy text-base font-semibold text-canvas transition-colors hover:bg-healthy/90 disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add plant"}
            </button>
          </>
        ) : null}
      </Drawer>
    </>
  );
}

/**
 * Placeholder grid shown while the species list loads. Mirrors the real chip
 * grid (same columns, gap, chip shape) so the layout doesn't jump when data
 * arrives — replacing the old centered "Loading…" line.
 */
function PickSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="status"
      aria-label="Loading houseplants"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex h-[60px] animate-pulse items-center gap-3 rounded-2xl bg-canvas-soft p-3"
        >
          <span className="size-7 shrink-0 rounded-full bg-cream/10" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="h-3 w-3/4 rounded bg-cream/10" />
            <span className="h-2.5 w-1/2 rounded bg-cream/5" />
          </span>
        </div>
      ))}
    </div>
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

function PickStage({
  token,
  list,
  filtered,
  query,
  setQuery,
  onPick,
  onManual,
  error,
}: {
  token: string;
  list: SpeciesDetail[] | null;
  filtered: SpeciesDetail[];
  query: string;
  setQuery: (v: string) => void;
  onPick: (species: SpeciesDetail) => void;
  onManual: () => void;
  error: string | null;
}) {
  return (
    <>
      {/* The list scrolls; pad the bottom so the last row clears the pinned
          manual-entry bar instead of hiding under it. */}
      <div className="flex flex-col gap-4 pb-44">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search houseplants…"
          className="no-ios-zoom w-full rounded-xl bg-canvas-soft px-3 py-2.5 text-sm text-cream placeholder:text-cream-soft outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
        />

        {error ? <p className="text-sm text-water">{error}</p> : null}

        {list === null ? (
          <PickSkeleton />
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-cream-soft">
            No matches. You can add it manually below.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onPick(s)}
                className="fade-in flex h-[60px] items-center gap-3 rounded-2xl bg-canvas-soft p-3 text-left transition-colors hover:bg-canvas-soft/70"
              >
                <span className="text-2xl" aria-hidden>
                  {s.avatar}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-cream">
                    {s.commonName}
                  </span>
                  <span className="text-xs text-cream-soft">
                    water · every {s.waterIntervalDays}d
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual-entry stays reachable, pinned to the bottom; the gradient lets
          the list dissolve into the canvas behind it as it scrolls under.
          pointer-events-none on the fade so it never blocks the chips it overlaps;
          re-enabled on the inner controls. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-canvas via-canvas to-transparent pt-16">
        <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-6">
          <button
            type="button"
            onClick={onManual}
            className="rounded-2xl border border-dashed border-cream-soft/40 px-4 py-3 text-sm font-medium text-cream-soft transition-colors hover:border-cream-soft hover:text-cream"
          >
            Can&apos;t find it? Add manually
          </button>

          <Link
            href={`/h/${token}`}
            className="self-center text-sm text-cream-soft hover:text-cream"
          >
            Cancel
          </Link>
        </div>
      </div>
    </>
  );
}
