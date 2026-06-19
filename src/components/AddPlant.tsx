"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Drawer } from "@/components/Drawer";
import {
  MANUAL_VALUES,
  PlantForm,
  type PlantFormValues,
  speciesToValues,
} from "@/components/PlantForm";
import type { SpeciesDetail, SpeciesSummary } from "@/lib/species";

/**
 * The add-plant screen: the species picker stays on the page, and tapping a
 * species (or "add manually") opens its care form in a drawer. Closing the
 * drawer drops the user straight back on the picker — with their search and
 * scroll intact — so choosing a different plant is one tap, not a round-trip
 * home. The picker keeps the page's dark canvas styling; the form lives on the
 * drawer's cream surface (the shared <PlantForm>, also used by the edit sheet).
 */
export function AddPlant({ token }: { token: string }) {
  const router = useRouter();

  // --- Picker (page) data ---
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

  // --- Form (drawer) data ---
  // `original` is the species the form was seeded from (null for manual entry);
  // `initial` holds the seed values. `formSeed` bumps on every open so the form
  // remounts fresh — re-picking a species discards any prior edits. `formOpen`
  // drives the drawer.
  const [formOpen, setFormOpen] = useState(false);
  const [original, setOriginal] = useState<SpeciesDetail | null>(null);
  const [initial, setInitial] = useState<PlantFormValues | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [picking, setPicking] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  async function pickSpecies(key: string) {
    setPicking(key);
    setPickError(null);
    try {
      const res = await fetch(`/api/species/${key}`);
      if (!res.ok) throw new Error();
      const { species } = (await res.json()) as { species: SpeciesDetail };
      setOriginal(species);
      setInitial(speciesToValues(species));
      setFormSeed((s) => s + 1);
      setFormOpen(true);
    } catch {
      setPickError("Couldn't load that species. Try another, or add manually.");
    } finally {
      setPicking(null);
    }
  }

  function startManual() {
    setOriginal(null);
    setInitial(MANUAL_VALUES);
    setFormSeed((s) => s + 1);
    setPickError(null);
    setFormOpen(true);
  }

  async function addPlant(values: PlantFormValues) {
    const res = await fetch(`/api/h/${token}/plants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        room: values.room.trim() || null,
        avatar: values.avatar,
        speciesKey: original?.key ?? null,
        commonName: original?.commonName ?? null,
        waterIntervalDays: Number(values.waterIntervalDays) || null,
        waterNote: values.waterNote.trim() || null,
        lightNote: values.lightNote.trim() || null,
        feedIntervalDays: Number(values.feedIntervalDays) || null,
        feedNote: values.feedNote.trim() || null,
        notes: values.notes.trim() || null,
      }),
    });
    if (!res.ok) throw new Error();
    router.push(`/h/${token}`);
    router.refresh();
  }

  return (
    <>
      <PickStage
        token={token}
        list={list}
        filtered={filtered}
        query={query}
        setQuery={setQuery}
        onPick={pickSpecies}
        picking={picking}
        onManual={startManual}
        error={!formOpen ? pickError : null}
      />

      <Drawer open={formOpen} onOpenChange={setFormOpen}>
        {initial ? (
          <PlantForm
            key={formSeed}
            initial={initial}
            species={original}
            title={original ? original.commonName : "New plant"}
            subtitle="Set the name, room and care details"
            submitLabel="Add plant"
            submittingLabel="Adding…"
            onSubmit={addPlant}
          />
        ) : null}
      </Drawer>
    </>
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
      </div>

      {/* Manual-entry stays reachable, pinned to the bottom; the gradient lets
          the list dissolve into the canvas behind it as it scrolls under.
          pointer-events-none on the fade so it never blocks the chips it overlaps;
          re-enabled on the inner controls.

          Portaled to <body> so it escapes the [data-vaul-drawer-wrapper] element,
          which vaul transforms (scale/translate) while the drawer is open. A
          transformed ancestor becomes the containing block for position:fixed
          descendants — left inside the wrapper, this bar would ride the scale
          animation and slide off-screen. At the body level it stays anchored to
          the viewport. */}
      <BodyPortal>
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
      </BodyPortal>
    </>
  );
}

/** Renders children into document.body (after mount, so SSR stays clean). Used
 * to lift the pinned manual-entry bar out of vaul's scaled drawer wrapper. */
function BodyPortal({ children }: { children: React.ReactNode }) {
  // false during SSR, true once hydrated — document.body only exists client-side.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
}
