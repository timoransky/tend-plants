/**
 * How dense the home plant grid is drawn — a personal *viewing* preference, not
 * household data, so it lives in this browser's localStorage (never the DB) and
 * is never shared through the capability link.
 *
 * Three steps map to how many plants sit per row: fewer columns = bigger
 * thumbnails. Reads are exposed as `useSyncExternalStore`-friendly snapshots
 * (stable server snapshot + a `storage`-event subscription) so the grid and the
 * toggle stay hydration-safe and update together, including across tabs — the
 * same shape as `household-storage`.
 */

import { useSyncExternalStore } from "react";

export type GridSize = "compact" | "comfortable" | "large";

/** Smallest → largest thumbnails; also the toggle's left → right order. */
export const GRID_SIZES: GridSize[] = ["compact", "comfortable", "large"];

/** Matches today's 3-up (mobile) / 5-up (desktop) grid, so nothing shifts for
 * anyone who never touches the control. */
export const DEFAULT_GRID_SIZE: GridSize = "comfortable";

const KEY = "tend:grid-size";

// --- pub/sub ---------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

// --- access (SSR + failure guarded) ----------------------------------------

function isGridSize(value: string | null): value is GridSize {
  return (
    value === "compact" || value === "comfortable" || value === "large"
  );
}

function getSnapshot(): GridSize {
  if (typeof window === "undefined") return DEFAULT_GRID_SIZE;
  try {
    const raw = window.localStorage.getItem(KEY);
    return isGridSize(raw) ? raw : DEFAULT_GRID_SIZE;
  } catch {
    return DEFAULT_GRID_SIZE;
  }
}

/** No localStorage on the server (and the first hydration render): assume the
 * default so the grid renders identically on both, then swaps to the stored
 * value once mounted. */
function getServerSnapshot(): GridSize {
  return DEFAULT_GRID_SIZE;
}

export function setGridSize(size: GridSize): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, size);
    } catch {
      // private mode / quota exceeded — fail silently; the app still works.
    }
  }
  notify();
}

/** The current thumbnail size for this browser. Re-renders on local changes
 * and on writes from other tabs. */
export function useGridSize(): GridSize {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
