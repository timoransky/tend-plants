import { KIND_BG, primaryNeed } from "@/lib/care-display";
import { SHOW_FEED } from "@/lib/features";
import type { CareState } from "@/lib/status";

/** A "no schedule" care state — neutralizes feed while feeding is hidden. */
const NO_CARE: CareState = {
  status: null,
  dueAt: null,
  lastDoneAt: null,
  intervalDays: null,
};

/**
 * The status dot shown on a plant avatar: blue when water is due, brown when
 * feed is due, green when the plant is fine. Driven entirely by computed state.
 * While feeding is hidden (SHOW_FEED=false), feed is ignored so the dot reads
 * water-only.
 */
export function StatusDot({
  water,
  feed,
  className = "",
}: {
  water: CareState;
  feed: CareState;
  className?: string;
}) {
  const { kind } = primaryNeed(water, SHOW_FEED ? feed : NO_CARE);
  return (
    <span
      className={`block size-3.5 rounded-full ring-2 ring-canvas transition-colors duration-500 ${KIND_BG[kind]} ${className}`}
    />
  );
}
