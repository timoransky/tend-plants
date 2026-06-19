import { DropletIcon } from "@hugeicons/core-free-icons";

/**
 * Hugeicons ships the droplet as a stroke icon whose first path is the closed
 * teardrop silhouette (the second path is a small inner accent we don't need).
 * We pull that exact silhouette and *fill* it instead of stroking it, so this
 * indicator is the same droplet shape used by the outline Hugeicons elsewhere
 * in the app — just solid.
 */
const DROP_PATH = (DropletIcon[0][1] as { d: string }).d;

/**
 * A filled water-drop glyph that takes its color from `currentColor` (water-blue
 * in use). It is the "needs water" status indicator on a plant avatar and the
 * leading mark in the room "thirsty" badge. Pass `outlined` to paint a
 * canvas-colored halo behind the fill so the drop reads cleanly when it sits
 * over a plant avatar.
 */
export function WaterDrop({
  className = "",
  outlined = false,
}: {
  className?: string;
  outlined?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d={DROP_PATH}
        fill="currentColor"
        {...(outlined
          ? {
              stroke: "var(--color-canvas)",
              strokeWidth: 3,
              style: { paintOrder: "stroke" },
            }
          : {})}
      />
    </svg>
  );
}
