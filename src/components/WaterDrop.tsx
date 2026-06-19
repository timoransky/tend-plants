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
        d="M12 2.2s7 8.1 7 12.6a7 7 0 1 1-14 0C5 10.3 12 2.2 12 2.2z"
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
