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
  /**
   * True for a short window right after care was performed — "someone already
   * did this". Purely derived; lets the household see at a glance that a plant
   * was just watered instead of guessing and double-watering it.
   */
  fresh: boolean;
};

/**
 * Start of the calendar day a moment falls in, as a UTC timestamp.
 *
 * Status is compared day-to-day rather than by raw elapsed hours, so a plant
 * becomes due on a *date* rather than at whatever o'clock it was last watered.
 * Without this, watering at 8pm pushes every later "due today" to 8pm too, and
 * the app's notion of a day drifts with each tap.
 *
 * The boundary is UTC because status is computed on the server and shipped to
 * every device in the household — a single shared boundary keeps them
 * consistent. For European households that lands in the small hours of the
 * morning, which is exactly when a day should roll over.
 */
function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * How many days ahead of the due date the "coming up" heads-up starts.
 *
 * Proportional to the interval (~20%) rather than a flat two days: two days
 * ahead of a 5-day plant is day 3 — barely past watering it — while two days
 * ahead of a 21-day plant is no warning at all. Clamped to 1–3 days so short
 * intervals still get a day's notice and long ones don't nag for a week.
 *
 *   5 → 1 (day 4)   7 → 1 (day 6)   9 → 2 (day 7)
 *  14 → 3 (day 11) 21 → 3 (day 18)
 */
export function upcomingWindowDays(intervalDays: number): number {
  return Math.min(3, Math.max(1, Math.round(intervalDays * 0.2)));
}

/**
 * How long after care a plant still reads as freshly cared for (~15% of the
 * interval, at minimum the rest of the day it was watered). Always shorter than
 * the gap to the next `upcoming`, so "just done" and "due soon" can't collide
 * for any sane interval.
 */
function freshWindowDays(intervalDays: number): number {
  return Math.min(3, Math.max(1, Math.round(intervalDays * 0.15)));
}

/**
 * Derive a care state from the last time something was done and its interval.
 *
 * - No interval → no schedule (status null).
 * - Never done → fall back to `since` (the plant's `createdAt`) as the schedule
 *   anchor: tracking starts when the plant is added, so a plant added today is
 *   `fine` for a full interval rather than urgent on day zero. `lastDoneAt`
 *   still reports null, so the care sheet keeps saying "Never watered".
 * - Otherwise compare the due *date* against today:
 *   - past due                      → overdue
 *   - due today                     → due_today
 *   - due within the upcoming window → upcoming
 *   - further out                   → fine
 */
export function computeCareState(
  lastDone: Date | null,
  intervalDays: number | null,
  now: Date,
  since: Date | null = null,
): CareState {
  const lastDoneAt = lastDone ? lastDone.toISOString() : null;

  if (intervalDays == null) {
    return {
      status: null,
      dueAt: null,
      lastDoneAt,
      intervalDays: null,
      fresh: false,
    };
  }

  const anchor = lastDone ?? since;
  if (anchor == null) {
    // Scheduled but with nothing to schedule from — needs care by definition.
    return {
      status: "overdue",
      dueAt: null,
      lastDoneAt: null,
      intervalDays,
      fresh: false,
    };
  }

  const today = startOfDay(now);
  const dueDay = startOfDay(new Date(anchor.getTime() + intervalDays * DAY_MS));
  const daysUntilDue = Math.round((dueDay - today) / DAY_MS);

  let status: CareStatus;
  if (daysUntilDue < 0) {
    status = "overdue";
  } else if (daysUntilDue === 0) {
    status = "due_today";
  } else if (daysUntilDue <= upcomingWindowDays(intervalDays)) {
    status = "upcoming";
  } else {
    status = "fine";
  }

  const daysSinceDone =
    lastDone == null ? null : Math.round((today - startOfDay(lastDone)) / DAY_MS);

  return {
    status,
    dueAt: new Date(dueDay).toISOString(),
    lastDoneAt,
    intervalDays,
    fresh:
      daysSinceDone != null && daysSinceDone < freshWindowDays(intervalDays),
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
