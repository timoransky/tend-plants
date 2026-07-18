"use client";

import { AiImageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { AddedPlantDrawer } from "@/components/AddedPlantDrawer";
import { Drawer } from "@/components/Drawer";
import {
  IdentifyDrawer,
  type IdentifyCandidateView,
} from "@/components/IdentifyDrawer";
import {
  MANUAL_VALUES,
  PlantForm,
  type PlantFormValues,
  speciesToValues,
} from "@/components/PlantForm";
import type { IdentifyCandidate, IdentifyResult } from "@/lib/identify";
import type { SpeciesDetail } from "@/lib/species";
import { tapScale } from "@/lib/ui";

/**
 * The add-plant screen: the species picker stays on the page, and tapping a
 * species (or "add manually") opens its care form in a drawer. Closing the
 * drawer drops the user straight back on the picker — with their search and
 * scroll intact — so choosing a different plant is one tap, not a round-trip
 * home. The picker keeps the page's dark canvas styling; the form lives on the
 * drawer's cream surface (the shared <PlantForm>, also used by the edit sheet).
 *
 * Saving doesn't navigate straight home: a nested <AddedPlantDrawer> slides up
 * over the form to confirm, then offers "Add another plant" (back to the picker)
 * or "Done" (home) — so adding several plants in a row never round-trips home.
 */
export function AddPlant({
  token,
  identifyEnabled,
}: {
  token: string;
  identifyEnabled: boolean;
}) {
  const router = useRouter();

  // --- Picker (page) data ---
  // The list carries full care detail, so picking a species opens its form with
  // no extra round-trip (the dataset is small and local).
  const [list, setList] = useState<SpeciesDetail[] | null>(null);
  const [query, setQuery] = useState("");

  // --- Photo identify (optional; only when identifyEnabled) ---
  // The review sheet owns the lifecycle: `identifyOpen` drives it, `identifying`
  // shows the loading state, `candidates` holds the ranked guesses (null while
  // loading, [] when nothing matched), `identifyError` a failure, `photoUrl` a
  // local preview of the picked photo.
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [candidates, setCandidates] = useState<IdentifyCandidate[] | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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

  // Enrich each candidate with its avatar for display: a dataset match shows the
  // species' emoji; an unlisted plant gets a neutral pot.
  const displayCandidates = useMemo<IdentifyCandidateView[] | null>(() => {
    if (!candidates) return null;
    return candidates.map((c) => ({
      ...c,
      avatar: c.speciesKey
        ? ((list ?? []).find((s) => s.key === c.speciesKey)?.avatar ?? "🪴")
        : "🪴",
    }));
  }, [candidates, list]);

  // --- Form (drawer) data ---
  // `original` is the species the form was seeded from (null for manual entry);
  // `initial` holds the seed values. `formSeed` bumps on every open so the form
  // remounts fresh — re-picking a species discards any prior edits. `formOpen`
  // drives the drawer.
  const [formOpen, setFormOpen] = useState(false);
  const [original, setOriginal] = useState<SpeciesDetail | null>(null);
  const [initial, setInitial] = useState<PlantFormValues | null>(null);
  const [formSeed, setFormSeed] = useState(0);

  // --- Success (nested drawer) ---
  // After a save, this confirmation sheet stacks over the still-open form; it
  // holds the saved plant's name/avatar for the "{name} added" header.
  const [successOpen, setSuccessOpen] = useState(false);
  const [added, setAdded] = useState<{ name: string; avatar: string } | null>(
    null,
  );

  // If the form drawer closes for any reason, drop the nested success sheet with
  // it (mirrors PlantDrawer's guard). Adjusting state during render is the
  // supported pattern for reacting to a changed value without an extra paint.
  const [prevFormOpen, setPrevFormOpen] = useState(formOpen);
  if (prevFormOpen !== formOpen) {
    setPrevFormOpen(formOpen);
    if (!formOpen) setSuccessOpen(false);
  }

  // Synchronous: the picker already holds full care detail, so opening the form
  // is just a state swap — no fetch, no loading flash.
  function pickSpecies(species: SpeciesDetail) {
    setOriginal(species);
    setInitial(speciesToValues(species));
    setFormSeed((s) => s + 1);
    setFormOpen(true);
  }

  function startManual(seedName?: string) {
    setOriginal(null);
    setInitial(seedName ? { ...MANUAL_VALUES, name: seedName } : MANUAL_VALUES);
    setFormSeed((s) => s + 1);
    setFormOpen(true);
  }

  // Take a photo → open the review sheet with a loading state → fill it with
  // Pl@ntNet's ranked guesses (or an error). Choosing a candidate lands on the
  // same form the picker would open. Also runs on "try another photo" from
  // inside the sheet, which just replaces the current result.
  async function handleIdentifyFile(file: File) {
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCandidates(null);
    setIdentifyError(null);
    setIdentifyOpen(true);
    setIdentifying(true);
    try {
      // Downscale client-side so the upload is small (faster round-trip, cheaper
      // call); fall back to the original bytes if the browser can't.
      const image = await downscaleImage(file).catch(() => file);
      const body = new FormData();
      body.append("image", image, "plant.jpg");

      const res = await fetch("/api/species/identify", { method: "POST", body });
      if (!res.ok) {
        setIdentifyError(
          res.status === 429
            ? "You’ve hit today’s identification limit. Try again tomorrow."
            : res.status === 503
              ? "Photo identification isn’t available right now."
              : "Something went wrong identifying that photo.",
        );
        return;
      }
      const { result } = (await res.json()) as { result: IdentifyResult };
      setCandidates(result.candidates ?? []);
    } catch {
      setIdentifyError("Something went wrong identifying that photo.");
    } finally {
      setIdentifying(false);
    }
  }

  // Close the review sheet, then run `action` once it has slid down — so the two
  // top-level drawers don't fight over vaul's background-scale in one frame.
  function afterIdentifyClose(action: () => void) {
    setIdentifyOpen(false);
    window.setTimeout(action, 220);
  }

  // A chosen candidate opens its pre-filled form: a dataset match its species
  // form, an unlisted plant manual entry with the name pre-filled.
  function chooseCandidate(candidate: IdentifyCandidateView) {
    const match = candidate.speciesKey
      ? (list ?? []).find((s) => s.key === candidate.speciesKey)
      : undefined;
    afterIdentifyClose(() =>
      match ? pickSpecies(match) : startManual(candidate.commonName || undefined),
    );
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
    // Keep Home current for whenever they finish, but don't navigate yet: leave
    // the form open and stack the success sheet over it (which scales it back).
    router.refresh();
    setAdded({ name: values.name, avatar: values.avatar });
    setSuccessOpen(true);
  }

  // "Add another": close both sheets back to the picker, with a clean search for
  // the next (likely different) plant.
  function addAnother() {
    setSuccessOpen(false);
    setFormOpen(false);
    setQuery("");
  }

  // "Done": leave the add flow for Home. vaul scales the [data-vaul-drawer-wrapper]
  // (in the root layout) while a drawer is open and only restores it when the
  // drawer *closes*. Navigating away tears the sheets down without that close
  // ever running, so the wrapper would stay shrunk on Home. Dismiss the sheets
  // first to drop vaul's scale management, then — on the next frame, after its
  // restore has flushed — clear any transform it left behind before navigating.
  function finish() {
    setSuccessOpen(false);
    setFormOpen(false);
    requestAnimationFrame(() => {
      document
        .querySelector("[data-vaul-drawer-wrapper]")
        ?.removeAttribute("style");
      router.push(`/h/${token}`);
    });
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
        onManual={startManual}
        identifyEnabled={identifyEnabled}
        onIdentifyFile={handleIdentifyFile}
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

        {/* Nested over the form: confirm the save, then add another or finish.
            Dismissing it (swipe/scrim) takes the "add another" path rather than
            re-revealing the already-submitted form. */}
        <AddedPlantDrawer
          name={added?.name ?? ""}
          avatar={added?.avatar ?? ""}
          open={successOpen}
          onOpenChange={(open) => (open ? setSuccessOpen(true) : addAnother())}
          onAddAnother={addAnother}
          onDone={finish}
        />
      </Drawer>

      {/* The photo-identify review sheet — a sibling top-level drawer, opened
          from the picker's Identify button. Owns loading / candidates / error. */}
      {identifyEnabled ? (
        <IdentifyDrawer
          open={identifyOpen}
          onOpenChange={setIdentifyOpen}
          photoUrl={photoUrl}
          loading={identifying}
          error={identifyError}
          candidates={displayCandidates}
          onChoose={chooseCandidate}
          onManual={() => afterIdentifyClose(() => startManual())}
          onRetryFile={handleIdentifyFile}
        />
      ) : null}
    </>
  );
}

/**
 * Downscale an image file to a JPEG no larger than 1024px on its long edge.
 * Keeps uploads small (faster, cheaper identification) and normalizes EXIF
 * orientation so a sideways phone photo isn't sent rotated. Rejects if the
 * browser can't decode the file (e.g. HEIC without support) — the caller then
 * falls back to sending the original bytes.
 */
async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Image encoding failed")),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
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

function PickStage({
  token,
  list,
  filtered,
  query,
  setQuery,
  onPick,
  onManual,
  identifyEnabled,
  onIdentifyFile,
}: {
  token: string;
  list: SpeciesDetail[] | null;
  filtered: SpeciesDetail[];
  query: string;
  setQuery: (v: string) => void;
  onPick: (species: SpeciesDetail) => void;
  onManual: (seedName?: string) => void;
  identifyEnabled: boolean;
  onIdentifyFile: (file: File) => void;
}) {
  return (
    <>
      {/* The list scrolls; pad the bottom so the last row clears the pinned
          action bar instead of hiding under it — taller when identify is on. */}
      <div
        className={`flex flex-col gap-4 ${identifyEnabled ? "pb-36" : "pb-24"}`}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search houseplants…"
          className="no-ios-zoom w-full rounded-xl bg-canvas-soft px-3 py-2.5 text-sm text-cream placeholder:text-cream-soft outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
        />

        {list === null ? (
          <PickSkeleton />
        ) : (
          <>
            {filtered.length === 0 ? (
              <p className="pt-6 text-center text-sm text-cream-soft">
                No matches{query.trim() ? ` for “${query.trim()}”` : ""}.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filtered.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onPick(s)}
                    className={`fade-in flex h-[60px] items-center gap-3 rounded-2xl bg-canvas-soft p-3 text-left ${tapScale} hover:bg-canvas-soft/70`}
                  >
                    <span className="text-2xl" aria-hidden>
                      {s.avatar}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-cream">
                        {s.commonName}
                      </span>
                      <span className="text-xs tabular-nums text-cream-soft">
                        water · every {s.waterIntervalDays}d
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Add-manually lives at the end of the list: reachable by scrolling
                to the bottom of the full list, and right there when a search
                finds nothing. Kept out of the pinned bar so Identify stays the
                hero; seeds the new plant's name from the current search. */}
            <button
              type="button"
              onClick={() => onManual(query.trim() || undefined)}
              className={`rounded-2xl border border-dashed border-cream-soft/40 px-4 py-3 text-sm font-medium text-cream-soft ${tapScale} hover:border-cream-soft hover:text-cream`}
            >
              Can&apos;t find it? Add manually
            </button>
          </>
        )}
      </div>

      {/* The pinned action bar: identify (primary, always reachable) → back
          link. "Add manually" lives at the end of the list instead. The gradient
          lets the list dissolve into the canvas behind it as it scrolls under.
          pointer-events-none on the fade so it never blocks the chips it
          overlaps; re-enabled on the inner controls.

          Portaled to <body> so it escapes the [data-vaul-drawer-wrapper] element,
          which vaul transforms (scale/translate) while the drawer is open. A
          transformed ancestor becomes the containing block for position:fixed
          descendants — left inside the wrapper, this bar would ride the scale
          animation and slide off-screen. At the body level it stays anchored to
          the viewport. */}
      <BodyPortal>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-canvas via-canvas to-transparent pt-16">
          <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-3 px-4 pb-6">
            {/* Primary action: take/choose a photo → the review sheet opens and
                owns all feedback (loading, results, errors). Only shown when the
                feature is configured server-side; the <input> is nested in the
                <label> so a tap opens the picker with no ref wiring. */}
            {identifyEnabled ? (
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-healthy/40 bg-healthy/10 px-4 py-3 text-sm font-medium text-cream ${tapScale} hover:bg-healthy/15`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    // Reset so re-picking the same file still fires onChange.
                    e.target.value = "";
                    if (file) onIdentifyFile(file);
                  }}
                />
                <HugeiconsIcon
                  icon={AiImageIcon}
                  size={18}
                  strokeWidth={1.9}
                  aria-hidden
                />
                Identify from a photo
              </label>
            ) : null}

            <Link
              href={`/h/${token}`}
              className="self-center text-sm text-cream-soft hover:text-cream"
            >
              Back to my plants
            </Link>
          </div>
        </div>
      </BodyPortal>
    </>
  );
}

/** Renders children into document.body (after mount, so SSR stays clean). Used
 * to lift the pinned action bar out of vaul's scaled drawer wrapper. */
function BodyPortal({ children }: { children: React.ReactNode }) {
  // false during SSR, true once hydrated — document.body only exists client-side.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
}
