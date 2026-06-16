"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { SpeciesDetail, SpeciesSummary } from "@/lib/species";

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

export function AddPlant({ token }: { token: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<"pick" | "form">("pick");

  // --- Stage 1 data ---
  const [list, setList] = useState<SpeciesSummary[] | null>(null);
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

  // --- Stage 2 data ---
  // `original` is the species the form was seeded from (null for manual entry).
  const [original, setOriginal] = useState<SpeciesDetail | null>(null);
  const [form, setForm] = useState<CareForm | null>(null);
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickSpecies(key: string) {
    setPicking(key);
    setError(null);
    try {
      const res = await fetch(`/api/species/${key}`);
      if (!res.ok) throw new Error();
      const { species } = (await res.json()) as { species: SpeciesDetail };
      setOriginal(species);
      setForm(formFromSpecies(species));
      setRoom("");
      setNotes("");
      setStage("form");
    } catch {
      setError("Couldn't load that species. Try another, or add manually.");
    } finally {
      setPicking(null);
    }
  }

  function startManual() {
    setOriginal(null);
    setForm({ name: "", ...MANUAL_DEFAULTS, waterIntervalDays: "7", feedIntervalDays: "30" } as CareForm);
    setRoom("");
    setNotes("");
    setError(null);
    setStage("form");
  }

  const isDirty = useMemo(() => {
    if (!original || !form) return false;
    const o = formFromSpecies(original);
    return (Object.keys(o) as (keyof CareForm)[]).some((k) => o[k] !== form[k]);
  }, [original, form]);

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

  if (stage === "pick") {
    return (
      <PickStage
        token={token}
        list={list}
        filtered={filtered}
        query={query}
        setQuery={setQuery}
        onPick={pickSpecies}
        picking={picking}
        onManual={startManual}
        error={error}
      />
    );
  }

  if (!form) return null;
  const set = (patch: Partial<CareForm>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setStage("pick")}
        className="self-start text-sm text-cream-soft hover:text-cream"
      >
        ← Choose a different plant
      </button>

      <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 text-ink">
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
            {Array.from(new Set([form.avatar, ...AVATAR_CHOICES])).map((emo) => (
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
              className="text-xs font-medium text-healthy transition-opacity disabled:opacity-40"
            >
              ↺ Reset to {original.commonName} defaults
            </button>
          ) : null}
        </div>

        <Field label="Water — every (days)" accent="text-water">
          <input
            type="number"
            min={1}
            value={form.waterIntervalDays}
            onChange={(e) => set({ waterIntervalDays: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Watering note" accent="text-water">
          <textarea
            value={form.waterNote}
            onChange={(e) => set({ waterNote: e.target.value })}
            rows={2}
            placeholder="When to water…"
            className="input resize-none"
          />
        </Field>

        <Field label="Light" accent="text-light">
          <textarea
            value={form.lightNote}
            onChange={(e) => set({ lightNote: e.target.value })}
            rows={2}
            placeholder="Light preference…"
            className="input resize-none"
          />
        </Field>

        <Field label="Feed — every (days)" accent="text-feed">
          <input
            type="number"
            min={1}
            value={form.feedIntervalDays}
            onChange={(e) => set({ feedIntervalDays: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Feeding note" accent="text-feed">
          <textarea
            value={form.feedNote}
            onChange={(e) => set({ feedNote: e.target.value })}
            rows={2}
            placeholder="How to feed…"
            className="input resize-none"
          />
        </Field>

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

      {error ? <p className="text-sm text-water">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !form.name.trim()}
        className="h-12 rounded-full bg-healthy text-base font-semibold text-canvas transition-colors hover:bg-healthy/90 disabled:opacity-60"
      >
        {submitting ? "Adding…" : "Add plant"}
      </button>
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
  picking,
  onManual,
  error,
}: {
  token: string;
  list: SpeciesSummary[] | null;
  filtered: SpeciesSummary[];
  query: string;
  setQuery: (v: string) => void;
  onPick: (key: string) => void;
  picking: string | null;
  onManual: () => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search houseplants…"
        className="w-full rounded-xl bg-canvas-soft px-3 py-2.5 text-sm text-cream placeholder:text-cream-soft outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
      />

      {error ? <p className="text-sm text-water">{error}</p> : null}

      {list === null ? (
        <p className="py-10 text-center text-sm text-cream-soft">Loading…</p>
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
              onClick={() => onPick(s.key)}
              disabled={picking !== null}
              className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-3 text-left transition-colors hover:bg-canvas-soft/70 disabled:opacity-60"
            >
              <span className="text-2xl" aria-hidden>
                {s.avatar}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-cream">
                  {picking === s.key ? "Loading…" : s.commonName}
                </span>
                <span className="text-xs text-cream-soft">
                  water · every {s.waterIntervalDays}d
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

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
  );
}
