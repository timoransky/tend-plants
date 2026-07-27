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

/**
 * The app's neutral / secondary button surface on the DARK canvas: a quiet
 * frosted pill — a hairline cream border over a faint cream tint that lifts on
 * hover. It stays legible whether it sits on the base `canvas` or on a hovered
 * `canvas-soft` row (a plain `canvas-soft` fill dissolves into the latter).
 *
 * Surface only — pair it with your own shape (e.g. `rounded-full`), size, text
 * colour, and press feedback (`tapScale`, which also supplies the colour
 * transition). Reserve it for SECONDARY actions: primary CTAs stay solid
 * `bg-healthy` / `bg-water`, destructive stays `bg-danger`. Dark-canvas only —
 * the cream tints are invisible on the cream drawer surfaces.
 */
export const neutralButton =
  "border border-cream/10 bg-cream/[0.08] hover:bg-cream/[0.14]";

/**
 * The app's three button sizes. Every control lands on one of three rungs:
 *
 *   36px  `buttonSm` / `buttonIcon` — header controls and inline pill CTAs
 *   40px  (hand-rolled) — the care-sheet Mark watered/fed pill, avatar tiles
 *   44px  `buttonLg` — every primary / footer action
 *
 * Like `neutralButton`, these are ONE ASPECT ONLY: size, shape, and type
 * scale. No colour, no surface, no motion — pair them with a fill (`bg-healthy`
 * / `bg-surface-muted` / `neutralButton`), a text colour, and `tapScale`.
 *
 * They also carry `inline-flex items-center justify-center`, which a `<button>`
 * gets for free but an `<a>`/`<Link>`/`<label>` does not — without it a fixed
 * height leaves the label sitting on the top edge.
 */

/**
 * Primary / footer action, 44px — drawer footers, both pinned bottom bars, form
 * submits. Deliberately has no horizontal padding: nearly every site is
 * `w-full` or `flex-1`, and the one auto-width case adds its own `px-*`.
 */
export const buttonLg =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full text-base font-semibold";

/**
 * Compact pill CTA, 36px — a call to action sitting inline in a body or card
 * (empty states, the welcome note) rather than anchored to the bottom of a
 * sheet. Matches the header row's height so the two never fight.
 */
export const buttonSm =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold";

/**
 * Circular icon-only control, 36px — the header row (back / share / add) and
 * the photo lightbox's close. Icon glyphs inside these render at 18px.
 */
export const buttonIcon =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full";
