import { SolidGlyph } from "@/components/SolidGlyph";
import { WaterDropBadge } from "@/components/WaterDropBadge";
import type { WaterBadge } from "@/lib/care-display";
import { TickCircleIcon } from "@/lib/icons";

/**
 * The corner mark on a plant avatar in the grid. Three faces, deliberately
 * ordered so a glance across the garden ranks them without reading anything:
 *
 * - `due`   — full-blue droplet, with a pulse behind it: water this now.
 * - `soon`  — the same droplet in the soft blue, no pulse: coming up.
 * - `fresh` — a green tick, not a droplet at all: someone just watered this.
 *
 * Two axes, and they mean different things. SHAPE says which domain you're in:
 * a droplet is about watering, the tick disc is about it being handled. FILL
 * says how loud, within a domain: soft blue is the same need as full blue, just
 * later. So `soon` is a quieter `due` — correctly, because it is one — while
 * `fresh` changes silhouette, because "already done" is not a quiet kind of
 * thirsty. That distinction is what stops the household re-watering something a
 * housemate handled yesterday.
 *
 * All three are Hugeicons glyphs on the same 24×24 grid, filled in a state
 * colour behind a brown canvas outline. Same construction, so they read as one
 * set, and the same size in the same slot without per-icon tuning: the droplet
 * is 17×20 on that grid and the tick disc 20×20, both centred. (An earlier pass
 * drew the tick as a CSS `rounded-full` span, which filled the whole 24×24 box
 * and read a good fifth larger than the droplet beside it.)
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
    return <WaterDropBadge variant="soft" className={className} />;
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
