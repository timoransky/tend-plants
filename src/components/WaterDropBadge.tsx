import { DropletIcon } from "@hugeicons/core-free-icons";

/**
 * Hugeicons ships the droplet as a two-path stroke icon: the closed teardrop
 * silhouette plus a small inner accent arc. We render both — exactly the glyph
 * used in the plant detail drawer — but recolored as a solid badge: water-blue
 * fill behind a dark-brown stroke. The stroke is `--color-canvas` (the warm
 * near-black brown of the dim background, ≈ #272019) so the drop reads cleanly
 * over a cream avatar, and the fill is `--color-water` (≈ #17A3F9).
 *
 * Pass `solid` for a fill-only variant (no stroke / no arc) — used as the ping
 * glow that pulses behind the badge when a plant is due now.
 */
const [DROP_BODY, DROP_ARC] = DropletIcon;
const DROP_PATH = (DROP_BODY[1] as { d: string }).d;
const ARC_PATH = (DROP_ARC[1] as { d: string }).d;

export function WaterDropBadge({
  className = "",
  solid = false,
}: {
  className?: string;
  solid?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d={DROP_PATH}
        fill="var(--color-water)"
        {...(solid
          ? {}
          : {
              stroke: "var(--color-canvas)",
              strokeWidth: 1.9,
            })}
      />
      {solid ? null : (
        <path
          d={ARC_PATH}
          fill="none"
          stroke="var(--color-canvas)"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
