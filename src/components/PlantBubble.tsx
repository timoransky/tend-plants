"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { CareBadge } from "@/components/CareBadge";
import { PlantAvatar } from "@/components/PlantAvatar";
import { waterBadge, type WaterBadge } from "@/lib/care-display";
import type { PlantWithStatus } from "@/lib/plants";

/**
 * Hover/press feedback for the bubble. The whole button is one target: hovering
 * anywhere (avatar or label) lifts the bubble toward the viewer with a gentle
 * scale, like picking the pot up off the dim canvas. Calm ease-out, no bounce.
 */
const bubbleMotion = {
  rest: { y: 0, scale: 1 },
  hover: { y: -5, scale: 1.05 },
  tap: { y: -1, scale: 0.96 },
};

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 8;

/** Spoken equivalent of the corner badge, for the button's accessible name. */
const STATE_LABEL: Record<WaterBadge | "none", string> = {
  due: "needs water",
  soon: "water soon",
  fresh: "recently watered",
  none: "healthy",
};

/**
 * A plant in the grid: a uniform circular avatar with its name, that opens the
 * detail drawer. A small badge sits in the corner carrying the plant's water
 * state — a pinging blue droplet when due now, a static outlined one when it's
 * coming up, a green check just after it was watered (see CareBadge). Plants
 * with nothing to say show no badge. Feeding is hidden, so this is water-only.
 *
 * A 500ms long-press enters multi-select mode (framer has no long-press gesture,
 * so raw pointer handlers run alongside motion's). In select mode a tap toggles
 * the plant instead of opening the drawer, a check indicator sits at the top-
 * right, and the hover lift is suppressed. Scrolling (pointer moves >8px) or an
 * early release cancels the press.
 */
export function PlantBubble({
  plant,
  delayMs,
  onSelect,
  selectMode = false,
  selected = false,
  onLongPress,
  onToggleSelect,
}: {
  plant: PlantWithStatus;
  delayMs: number;
  onSelect: (plant: PlantWithStatus) => void;
  selectMode?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onToggleSelect?: () => void;
}) {
  const reduce = useReducedMotion();
  const badge = waterBadge(plant.water);
  const stateLabel = STATE_LABEL[badge ?? "none"];

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  // Set true when the long-press fires so the click it precedes is swallowed
  // (pointer-up still dispatches a click after the timer has already acted).
  const fired = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function cancelPress() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!onLongPress) return;
    fired.current = false;
    origin.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      fired.current = true;
      navigator.vibrate?.(10);
      onLongPress();
      cancelPress();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const o = origin.current;
    if (!o) return;
    if (Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_CANCEL_PX) {
      cancelPress();
    }
  }

  function handleClick() {
    if (fired.current) {
      fired.current = false;
      return;
    }
    if (selectMode) onToggleSelect?.();
    else onSelect(plant);
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-label={`${plant.name}${plant.room ? `, ${plant.room}` : ""}, ${stateLabel}`}
      aria-pressed={selectMode ? selected : undefined}
      initial="rest"
      animate="rest"
      whileHover={reduce || selectMode ? undefined : "hover"}
      whileTap={reduce ? undefined : "tap"}
      className="rise group flex w-full select-none flex-col items-center gap-1.5 rounded-3xl p-1.5 text-center outline-none transition-colors [-webkit-touch-callout:none] focus-visible:bg-canvas-soft"
    >
      <motion.span
        variants={bubbleMotion}
        transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full"
      >
        <span
          className={`flex aspect-square w-full items-center justify-center rounded-full bg-surface text-5xl shadow-[0_1px_2px_0_rgb(20_16_8_/_0.4),0_4px_8px_-2px_rgb(20_16_8_/_0.28)] transition-shadow duration-200 ease-out [&_img]:pointer-events-none group-hover:shadow-[0_2px_5px_-1px_rgb(20_16_8_/_0.4),0_16px_30px_-6px_rgb(20_16_8_/_0.45)] ${
            selected ? "ring-[3px] ring-water" : ""
          }`}
        >
          <PlantAvatar
            avatar={plant.avatar}
            imageUrl={plant.avatarUrl}
            alt={plant.name}
          />
        </span>
        {badge ? (
          <CareBadge
            badge={badge}
            pulse={!reduce}
            className="absolute bottom-[4.5%] right-[4.5%] size-[22%]"
          />
        ) : null}
        {selectMode ? (
          <span
            aria-hidden
            className={`absolute right-[4.5%] top-[4.5%] flex size-[22%] items-center justify-center rounded-full ${
              selected
                ? "bg-water text-canvas"
                : "border-2 border-cream/50 bg-scrim/30"
            }`}
          >
            {selected ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-[65%]"
                aria-hidden
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
        ) : null}
      </motion.span>
      <span className="w-full truncate px-0.5 text-xs font-medium text-cream">
        {plant.name}
      </span>
    </motion.button>
  );
}
