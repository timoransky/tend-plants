/**
 * Local memory of households this browser has used.
 *
 * There are no accounts — the URL token is the only key — so we remember:
 *   - the *primary* household (what `/` redirects to on return), and
 *   - a *visited* list (every household opened here) that powers the switcher.
 *
 * Opening a shared link records a visit but NEVER changes the primary; adopting
 * a visited household as your own home is an explicit action (`setPrimary`).
 *
 * Reads are exposed as `useSyncExternalStore`-friendly snapshots (stable
 * references + a server snapshot) so components stay hydration-safe and update
 * on local changes, including writes from other tabs (the `storage` event).
 */

const PRIMARY_KEY = "tend:household";
const VISITED_KEY = "tend:visited";

export type VisitedHousehold = {
  token: string;
  name: string | null;
  lastVisitedAt: number;
};

// --- pub/sub ---------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
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

// --- low-level access (SSR + failure guarded) ------------------------------

function readString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota exceeded — fail silently; the app still works.
  }
}

// --- primary household -----------------------------------------------------

/** The household `/` redirects to, or null if this browser has none yet. */
export function getPrimary(): string | null {
  return readString(PRIMARY_KEY);
}

/** There is no localStorage on the server. */
export function getPrimaryServerSnapshot(): null {
  return null;
}

/** Adopt a household as this browser's home. The only way primary changes. */
export function setPrimary(token: string): void {
  writeString(PRIMARY_KEY, token);
  notify();
}

// --- visited households ----------------------------------------------------

const EMPTY_VISITED: VisitedHousehold[] = [];

// Cache the parsed list so the snapshot reference is stable between reads —
// required by useSyncExternalStore to avoid infinite render loops.
let visitedCache: { raw: string | null; value: VisitedHousehold[] } = {
  raw: null,
  value: EMPTY_VISITED,
};

/** Visited households, most-recently-visited first. Stable reference. */
export function getVisited(): VisitedHousehold[] {
  const raw = readString(VISITED_KEY);
  if (raw === visitedCache.raw) return visitedCache.value;
  let value: VisitedHousehold[] = EMPTY_VISITED;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed as VisitedHousehold[];
  } catch {
    value = EMPTY_VISITED;
  }
  visitedCache = { raw, value };
  return value;
}

export function getVisitedServerSnapshot(): VisitedHousehold[] {
  return EMPTY_VISITED;
}

function writeVisited(list: VisitedHousehold[]): void {
  writeString(VISITED_KEY, JSON.stringify(list));
  notify();
}

/** Record (or refresh) a visit: move the household to the front and update its
 * remembered name. Does not touch the primary household. */
export function recordVisit(token: string, name: string | null): void {
  const rest = getVisited().filter((h) => h.token !== token);
  writeVisited([{ token, name, lastVisitedAt: Date.now() }, ...rest]);
}

export function removeVisited(token: string): void {
  writeVisited(getVisited().filter((h) => h.token !== token));
}
