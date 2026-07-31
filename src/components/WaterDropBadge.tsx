import { SolidGlyph } from "@/components/SolidGlyph";
import { DropletIcon } from "@/lib/icons";

/**
 * The water droplet as a solid badge (see SolidGlyph): water-blue fill behind a
 * dark-brown outline. The outline is `--color-canvas` (the warm near-black
 * brown of the dim background, ≈ #272019) so the drop reads cleanly over a
 * cream avatar, and the fill is `--color-water` (≈ #17A3F9).
 *
 * Variants:
 * - `filled` — the default badge: water-blue drop, brown outline. "Needs water
 *   now."
 * - `soft`   — the same drop in `--color-water-soft`: the heads-up state. A
 *   second *full*-blue drop would be indistinguishable from an actually-due one
 *   at grid size, so this turns the fill down rather than the outline up. An
 *   earlier pass inverted it instead (cream fill, blue outline), which read as
 *   a different kind of thing entirely — every other badge in the app is a
 *   coloured fill behind a brown outline, and that one alone wasn't.
 * - `glow`   — fill only, no outline or accent arc; the pulse behind a due
 *   badge.
 *
 * Turning the fill down is also the honest encoding: "coming up" really is a
 * quieter version of "due" — same need, later — so it should look like one.
 * "Freshly watered" is not, which is why that badge changes shape instead.
 */
export type DropVariant = "filled" | "soft" | "glow";

export function WaterDropBadge({
  className = "",
  variant = "filled",
}: {
  className?: string;
  variant?: DropVariant;
}) {
  if (variant === "glow") {
    return (
      <SolidGlyph
        icon={DropletIcon}
        fill="var(--color-water)"
        silhouetteOnly
        className={className}
      />
    );
  }

  return (
    <SolidGlyph
      icon={DropletIcon}
      fill={
        variant === "soft" ? "var(--color-water-soft)" : "var(--color-water)"
      }
      stroke="var(--color-canvas)"
      className={className}
    />
  );
}
