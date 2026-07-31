import type { DropletIcon } from "@/lib/icons";

/**
 * Renders a Hugeicons glyph as a *solid badge* rather than the stroke icon it
 * ships as: the first path is filled, and every path is stroked in a second
 * colour on top. That's how the water droplet and the fresh tick both become
 * chunky little markers that survive being dropped on a cream avatar at 22% of
 * its width.
 *
 * Hugeicons draws each glyph as one silhouette path plus any accent paths (the
 * droplet's inner arc, the tick inside its disc), so "fill index 0, stroke all"
 * is the general shape of the transform. `HugeiconsIcon` can't do this — it
 * leaves every path inheriting one `fill`, which fills the accent strokes into
 * blobs.
 *
 * Because the whole vocabulary sits on the same 24×24 grid centred on (12,12),
 * two glyphs rendered through here at the same box size come out optically
 * matched with no per-icon tuning.
 */
export function SolidGlyph({
  icon,
  fill,
  stroke,
  strokeWidth = 1.9,
  silhouetteOnly = false,
  className = "",
}: {
  icon: typeof DropletIcon;
  fill: string;
  /** Omit for a fill-only glyph (no outline, no accent paths drawn). */
  stroke?: string;
  strokeWidth?: number;
  /** Drop the accent paths and keep just the filled silhouette. */
  silhouetteOnly?: boolean;
  className?: string;
}) {
  const parts = silhouetteOnly ? icon.slice(0, 1) : icon;

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      {parts.map(([tag, attrs], i) => {
        const Tag = tag as "path";
        return (
          <Tag
            {...attrs}
            key={String(attrs.key ?? i)}
            fill={i === 0 ? fill : "none"}
            stroke={stroke}
            strokeWidth={stroke ? strokeWidth : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
