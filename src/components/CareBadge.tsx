import { SolidGlyph } from "@/components/SolidGlyph";
import { WaterDropBadge } from "@/components/WaterDropBadge";
import type { WaterBadge } from "@/lib/care-display";
import { TickCircleIcon } from "@/lib/icons";

/**
 * The corner mark on a plant avatar in the grid. Three faces, deliberately
 * ordered so a glance across the garden ranks them without reading anything:
 *
 * - `due`   — solid blue droplet (with a pulse behind it): water this now.
 * - `soon`  — the same droplet inverted to an outline, no pulse: coming up.
 * - `fresh` — a green tick, not a droplet at all: someone just watered this.
 *
 * The shape change on `fresh` is the point. A recently-watered plant is not a
 * quieter kind of thirsty, so it doesn't get a quieter kind of droplet — it
 * gets a different silhouette, which is what stops the household re-watering
 * something a housemate handled yesterday.
 *
 * All three are Hugeicons glyphs on the same 24×24 grid, which is what keeps
 * them the same size in the same slot: the droplet is 17×20 there and the tick
 * disc 20×20, both centred. (An earlier pass drew the tick as a CSS
 * `rounded-full` span, which filled the full 24×24 box and read a good fifth
 * larger than the droplet it was meant to sit alongside.)
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
    // The disc is filled healthy-green with the tick knocked out in the canvas
    // brown, mirroring how the droplet is filled water-blue over a canvas
    // outline — same construction, so the pair reads as one set.
    return (
      <SolidGlyph
        icon={TickCircleIcon}
        fill="var(--color-healthy)"
        stroke="var(--color-canvas)"
        strokeWidth={2.2}
        className={className}
      />
    );
  }

  if (badge === "soon") {
    return <WaterDropBadge variant="outline" className={className} />;
  }

  // Two spans, not one: the outer takes the caller's classes verbatim (which
  // include `absolute` for the corner slot), and a separate inner span owns the
  // `relative` that the pulse positions against. Merging them into
  // `relative ${className}` looks equivalent and isn't — `relative` and
  // `absolute` have equal specificity, so the stylesheet's order decides which
  // wins, not the order they're written in here, and the badge drops out of its
  // corner.
  return (
    <span className={className}>
      <span className="relative block size-full">
        {pulse ? (
          <WaterDropBadge
            variant="glow"
            className="absolute inset-0 size-full animate-ping opacity-75 [animation-duration:1.8s]"
          />
        ) : null}
        <WaterDropBadge className="relative size-full" />
      </span>
    </span>
  );
}
