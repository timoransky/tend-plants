import { KIND_BG, primaryNeed } from "@/lib/care-display";
import type { CareState } from "@/lib/status";

/**
 * The status dot shown on a plant avatar: blue when water is due, brown when
 * feed is due, green when the plant is fine. Driven entirely by computed state.
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
  const { kind } = primaryNeed(water, feed);
  return (
    <span
      className={`block size-3.5 rounded-full ring-2 ring-canvas transition-colors duration-500 ${KIND_BG[kind]} ${className}`}
    />
  );
}
