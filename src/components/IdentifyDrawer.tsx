"use client";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";
import { buttonLg, tapScale } from "@/lib/ui";

/**
 * The photo-identify review sheet: a bottom drawer that owns the whole moment
 * after a photo is picked — a loading skeleton, then Pl@ntNet's ranked guesses
 * to confirm or correct, or a "couldn't identify" state. Identification is a
 * guess, so this sheet makes it one the user confirms rather than a fact we act
 * on silently: they tap the best match, pick a close alternative, retry with a
 * new photo, or fall back to search / manual entry.
 *
 * Presentational only — the fetch, state, and routing to the plant form live in
 * <AddPlant>; this renders whatever state it's handed.
 */

/** A candidate enriched with its display avatar (resolved from the dataset). */
export type IdentifyCandidateView = {
  speciesKey: string;
  commonName: string;
  confidence: "high" | "medium" | "low";
  avatar: string;
};

const CONFIDENCE: Record<
  IdentifyCandidateView["confidence"],
  { label: string; chip: string }
> = {
  high: { label: "Looks likely", chip: "bg-healthy/15 text-healthy-ink" },
  medium: { label: "Best guess", chip: "bg-surface-muted text-ink-soft" },
  low: { label: "Not sure", chip: "bg-surface-muted text-ink-soft" },
};

export function IdentifyDrawer({
  open,
  onOpenChange,
  photoUrl,
  loading,
  error,
  candidates,
  onChoose,
  onManual,
  onRetryFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl: string | null;
  loading: boolean;
  error: string | null;
  candidates: IdentifyCandidateView[] | null;
  onChoose: (candidate: IdentifyCandidateView) => void;
  onManual: () => void;
  onRetryFile: (file: File) => void;
}) {
  const hasMatches = !loading && !error && !!candidates && candidates.length > 0;
  const noMatch = !loading && !error && !hasMatches;

  const title = loading
    ? "Identifying…"
    : hasMatches
      ? "Is this your plant?"
      : "Hmm, no match";
  const description = loading
    ? "Checking your photo against thousands of plants."
    : hasMatches
      ? "Tap the best match, or add it yourself."
      : (error ??
        "We couldn’t identify a plant in that photo. Try another, or add it yourself.");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <header className="flex items-center gap-4 pb-5">
        <span
          className="size-16 shrink-0 rounded-2xl bg-surface-muted bg-cover bg-center"
          style={
            photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined
          }
          aria-hidden
        />
        <div className="min-w-0">
          <DrawerTitle className="text-2xl font-semibold tracking-tight text-ink">
            {title}
          </DrawerTitle>
          <DrawerDescription className="text-pretty text-sm text-ink-soft">
            {description}
          </DrawerDescription>
        </div>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : hasMatches ? (
        <div className="fade-in flex flex-col gap-4">
          <CandidateButton
            candidate={candidates[0]}
            hero
            onClick={() => onChoose(candidates[0])}
          />

          {candidates.length > 1 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Also maybe
              </p>
              {candidates.slice(1).map((candidate) => (
                <CandidateButton
                  key={candidate.speciesKey || candidate.commonName}
                  candidate={candidate}
                  onClick={() => onChoose(candidate)}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-ink/10 pt-4">
            <button
              type="button"
              onClick={onManual}
              className={`${buttonLg} w-full bg-surface-muted text-ink ${tapScale} hover:bg-surface-muted/70`}
            >
              None of these - add manually
            </button>
            <div className="flex justify-center pt-1 text-sm text-ink-soft">
              <RetryLabel onRetryFile={onRetryFile} />
            </div>
          </div>
        </div>
      ) : noMatch ? (
        <div className="fade-in flex flex-col gap-2">
          <RetryButton onRetryFile={onRetryFile} />
          <button
            type="button"
            onClick={onManual}
            className={`${buttonLg} w-full bg-surface-muted text-ink ${tapScale} hover:bg-surface-muted/70`}
          >
            Add manually
          </button>
        </div>
      ) : null}
    </Drawer>
  );
}

function CandidateButton({
  candidate,
  hero,
  onClick,
}: {
  candidate: IdentifyCandidateView;
  hero?: boolean;
  onClick: () => void;
}) {
  const { label, chip } = CONFIDENCE[candidate.confidence];
  const inLibrary = !!candidate.speciesKey;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${tapScale} ${
        hero
          ? "border border-healthy/40 bg-healthy/10 hover:bg-healthy/15"
          : "bg-surface-muted/60 hover:bg-surface-muted"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-surface-muted ${
          hero ? "size-12 text-2xl" : "size-10 text-xl"
        }`}
        aria-hidden
      >
        {candidate.avatar}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`truncate font-semibold text-ink ${hero ? "text-base" : "text-sm"}`}
        >
          {candidate.commonName}
        </span>
        {inLibrary ? null : (
          <span className="text-xs text-ink-soft">Not in your library</span>
        )}
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${chip}`}
      >
        {label}
      </span>
    </button>
  );
}

/** "Try another photo" as a filled primary (the main retry in the no-match state). */
function RetryButton({
  onRetryFile,
}: {
  onRetryFile: (file: File) => void;
}) {
  return (
    <label
      className={`${buttonLg} w-full cursor-pointer bg-healthy text-canvas ${tapScale} hover:bg-healthy/90`}
    >
      <RetryInput onRetryFile={onRetryFile} />
      Try another photo
    </label>
  );
}

/** "Try another photo" as a quiet text link (alongside the candidate list). */
function RetryLabel({
  onRetryFile,
}: {
  onRetryFile: (file: File) => void;
}) {
  return (
    <label className="cursor-pointer hover:text-ink">
      <RetryInput onRetryFile={onRetryFile} />
      Try another photo
    </label>
  );
}

function RetryInput({ onRetryFile }: { onRetryFile: (file: File) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Reset so re-picking the same file still fires onChange.
        e.target.value = "";
        if (file) onRetryFile(file);
      }}
    />
  );
}

/** Pulsing rows that mirror the candidate layout, so there's no jump on load. */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Identifying">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className="flex h-[68px] animate-pulse items-center gap-3 rounded-2xl bg-surface-muted/60 p-3"
        >
          <span className="size-10 shrink-0 rounded-full bg-ink/10" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-3 w-1/2 rounded bg-ink/10" />
            <span className="h-2.5 w-1/4 rounded bg-ink/5" />
          </span>
        </div>
      ))}
    </div>
  );
}
