import { SolidGlyph } from "@/components/SolidGlyph";
import { DropletIcon } from "@/lib/icons";

/**
 * The water droplet as a solid badge (see SolidGlyph): water-blue fill behind a
 * dark-brown outline. The outline is `--color-canvas` (the warm near-black
 * brown of the dim background, ≈ #272019) so the drop reads cleanly over a
 * cream avatar, and the fill is `--color-water` (≈ #17A3F9).
 *
 * Variants:
 * - `filled`  — the default badge: blue drop, dark outline. "Needs water now."
 * - `outline` — the same silhouette inverted: cream drop, blue outline. Used
 *   for the heads-up state, where a second filled blue drop would be
 *   indistinguishable from an actually-due one at grid size.
 * - `glow`    — fill only, no outline or accent arc; the pulse behind a due
 *   badge.
 */
export type DropVariant = "filled" | "outline" | "glow";

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

  const inverted = variant === "outline";
  return (
    <SolidGlyph
      icon={DropletIcon}
      fill={inverted ? "var(--color-surface)" : "var(--color-water)"}
      stroke={inverted ? "var(--color-water)" : "var(--color-canvas)"}
      className={className}
    />
  );
}
