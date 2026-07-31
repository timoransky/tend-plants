import { SolidGlyph } from "@/components/SolidGlyph";
import { DropletIcon } from "@/lib/icons";

/**
 * The water droplet as a solid badge (see SolidGlyph): water-blue fill behind a
 * dark-brown outline. The outline is `--color-canvas` (the warm near-black
 * brown of the dim background, ≈ #272019) so the drop reads cleanly over a
 * cream avatar, and the fill is `--color-water` (≈ #17A3F9).
 *
 * Variants:
 * - `filled` — the badge itself: water-blue drop, brown outline.
 * - `glow`   — fill only, no outline or accent arc; the pulse behind it.
 */
export type DropVariant = "filled" | "glow";

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
      fill="var(--color-water)"
      stroke="var(--color-canvas)"
      className={className}
    />
  );
}
