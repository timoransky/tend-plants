"use client";

import {
  GRID_SIZES,
  setGridSize,
  useGridSize,
  type GridSize,
} from "@/lib/grid-size";
import { tapScale } from "@/lib/ui";

const LABELS: Record<GridSize, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  large: "Large",
};

/**
 * A density glyph per step: many small squares (compact) → a few medium ones
 * (comfortable) → one big square (large), so the icon reads as "thumbnails get
 * bigger left to right" at a glance. Drawn in currentColor so it inherits the
 * segment's selected/idle text colour.
 */
function GridGlyph({ size }: { size: GridSize }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {size === "compact"
        ? [4, 10, 16].flatMap((y) =>
            [4, 10, 16].map((x) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" />
            )),
          )
        : size === "comfortable"
          ? [5, 14].flatMap((y) =>
              [5, 14].map((x) => (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width="5"
                  height="5"
                  rx="1.4"
                />
              )),
            )
          : [<rect key="lg" x="5" y="5" width="14" height="14" rx="3.5" />]}
    </svg>
  );
}

/**
 * Segmented control for the home grid's thumbnail size. A single-choice
 * radiogroup: picking a segment writes the preference to localStorage (via the
 * grid-size store), which the grid reads through the same hook — no props to
 * thread, they just stay in sync.
 */
export function GridSizeToggle() {
  const current = useGridSize();

  return (
    <div
      role="radiogroup"
      aria-label="Thumbnail size"
      className="inline-flex items-center gap-0.5 rounded-full bg-canvas-soft p-1"
    >
      {GRID_SIZES.map((size) => {
        const selected = size === current;
        return (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={LABELS[size]}
            title={LABELS[size]}
            onClick={() => setGridSize(size)}
            className={`flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cream ${tapScale} ${
              selected
                ? "bg-surface text-ink shadow-sm"
                : "text-cream-soft hover:text-cream"
            }`}
          >
            <GridGlyph size={size} />
          </button>
        );
      })}
    </div>
  );
}
