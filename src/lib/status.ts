/**
 * Care-status computation — the core mechanic. Status is always *derived* from
 * the last care event + the interval; we never store a fixed status or clock
 * time (see the spec). Shared by the home timeline ordering and the status dot.
 */

export type CareStatus = "overdue" | "due_today" | "upcoming" | "fine";

/** Rank for sorting a timeline by urgency (lower = more urgent). */
export const CARE_STATUS_RANK: Record<CareStatus, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  fine: 3,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type CareState = {
  /** null when there is no schedule (no interval set). */
  status: CareStatus | null;
  /** When the next care is due, ISO string; null if not computable. */
  dueAt: string | null;
  /** The last time this care was performed, ISO string; null if never. */
  lastDoneAt: string | null;
  intervalDays: number | null;
};

/**
 * Derive a care state from the last time something was done and its interval.
 *
 * - No interval → no schedule (status null).
 * - Has interval but never done → treated as `overdue` (needs first care).
 * - Otherwise compare the due date (lastDone + interval) against `now`:
 *   - past due            → overdue
 *   - due within 24h      → due_today
 *   - due in the next 1–2 days → upcoming
 *   - further out         → fine
 */
export function computeCareState(
  lastDone: Date | null,
  intervalDays: number | null,
  now: Date,
): CareState {
  if (intervalDays == null) {
    return {
      status: null,
      dueAt: null,
      lastDoneAt: lastDone ? lastDone.toISOString() : null,
      intervalDays: null,
    };
  }

  if (lastDone == null) {
    return {
      status: "overdue",
      dueAt: null,
      lastDoneAt: null,
      intervalDays,
    };
  }

  const dueAt = new Date(lastDone.getTime() + intervalDays * DAY_MS);
  const daysUntilDue = (dueAt.getTime() - now.getTime()) / DAY_MS;

  let status: CareStatus;
  if (daysUntilDue < 0) {
    status = "overdue";
  } else if (daysUntilDue < 1) {
    status = "due_today";
  } else if (daysUntilDue <= 2) {
    status = "upcoming";
  } else {
    status = "fine";
  }

  return {
    status,
    dueAt: dueAt.toISOString(),
    lastDoneAt: lastDone.toISOString(),
    intervalDays,
  };
}

/**
 * The plant's overall dot color is driven by its most urgent care need.
 * Water takes precedence over feed when both are equally urgent (blue is the
 * primary urgent color in the spec).
 */
export function overallStatus(
  water: CareState,
  feed: CareState,
): CareStatus | null {
  const candidates = [water.status, feed.status].filter(
    (s): s is CareStatus => s != null,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((most, s) =>
    CARE_STATUS_RANK[s] < CARE_STATUS_RANK[most] ? s : most,
  );
}
