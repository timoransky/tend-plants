import { WaterDropBadge } from "@/components/WaterDropBadge";
import type { WaterBadge } from "@/lib/care-display";

/**
 * The corner mark on a plant avatar in the grid. Three faces, deliberately
 * ordered so a glance across the garden ranks them without reading anything:
 *
 * - `due`   — solid blue droplet (with a pulse behind it): water this now.
 * - `soon`  — the same droplet inverted to an outline, no pulse: coming up.
 * - `fresh` — a green check, not a droplet at all: someone just watered this.
 *
 * The shape change on `fresh` is the point. A recently-watered plant is not a
 * quieter kind of thirsty, so it doesn't get a quieter kind of droplet — it
 * gets a different silhouette, which is what stops the household re-watering
 * something a housemate handled an hour ago.
 *
 * `pulse` is passed false for reduced-motion.
 */
export function CareBadge({
  badge,
  pulse = true,
  className = "",
}: {
  badge: WaterBadge;
  pulse?: boolean;
  className?: string;
}) {
  if (badge === "fresh") {
    return (
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-full bg-healthy ring-[1.5px] ring-canvas ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-[62%]" aria-hidden>
          <path
            d="M5 13l4.5 4.5L19 7"
            stroke="var(--color-canvas)"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (badge === "soon") {
    return <WaterDropBadge variant="outline" className={className} />;
  }

  return (
    <span className={`relative block ${className}`}>
      {pulse ? (
        <WaterDropBadge
          variant="glow"
          className="absolute inset-0 size-full animate-ping opacity-75 [animation-duration:1.8s]"
        />
      ) : null}
      <WaterDropBadge className="relative size-full" />
    </span>
  );
}
