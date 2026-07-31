import { DropletIcon } from "@hugeicons/core-free-icons";

/**
 * Hugeicons ships the droplet as a two-path stroke icon: the closed teardrop
 * silhouette plus a small inner accent arc. We render both — exactly the glyph
 * used in the plant detail drawer — but recolored as a solid badge: water-blue
 * fill behind a dark-brown stroke. The stroke is `--color-canvas` (the warm
 * near-black brown of the dim background, ≈ #272019) so the drop reads cleanly
 * over a cream avatar, and the fill is `--color-water` (≈ #17A3F9).
 *
 * Variants:
 * - `filled`  — the default badge: blue drop, dark outline. "Needs water now."
 * - `outline` — the same silhouette inverted: cream drop, blue outline. Used
 *   for the heads-up state, where a second filled blue drop would be
 *   indistinguishable from an actually-due one at grid size.
 * - `glow`    — fill only, no stroke or arc; the pulse behind a due badge.
 */
const [DROP_BODY, DROP_ARC] = DropletIcon;
const DROP_PATH = (DROP_BODY[1] as { d: string }).d;
const ARC_PATH = (DROP_ARC[1] as { d: string }).d;

export type DropVariant = "filled" | "outline" | "glow";

export function WaterDropBadge({
  className = "",
  variant = "filled",
}: {
  className?: string;
  variant?: DropVariant;
}) {
  const fill =
    variant === "outline" ? "var(--color-surface)" : "var(--color-water)";
  const stroke =
    variant === "outline" ? "var(--color-water)" : "var(--color-canvas)";

  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d={DROP_PATH}
        fill={fill}
        {...(variant === "glow" ? {} : { stroke, strokeWidth: 1.9 })}
      />
      {variant === "glow" ? null : (
        <path
          d={ARC_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
