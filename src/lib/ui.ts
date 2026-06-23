/**
 * Shared className fragments for consistent interaction feel.
 */

/**
 * Tactile press feedback for plain (non-motion) buttons and links: a subtle 0.96
 * scale-down on press. Implemented as an interruptible CSS transition (so a
 * release mid-press smoothly returns) and gated behind `motion-safe:` so it
 * does nothing under `prefers-reduced-motion`, matching the rest of the app's
 * motion handling (the `useReducedMotion()` gates and the keyframe `@media`).
 *
 * Use this in place of an element's existing `transition-colors` /
 * `transition-opacity` — never alongside, since a second `transition-*` utility
 * clobbers `transition-property`. The listed properties cover the hover/disabled
 * transitions in use (background, border, text colour, ring/shadow, opacity)
 * plus `scale` for the press itself.
 */
export const tapScale =
  "transition-[background-color,border-color,color,box-shadow,opacity,scale] duration-150 ease-out motion-safe:active:scale-[0.96]";
