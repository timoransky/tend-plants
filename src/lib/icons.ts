/**
 * The app's shared icon vocabulary.
 *
 * Everything is Hugeicons, drawn on the same 24×24 grid and centred on (12,12),
 * so glyphs at one size rung are optically the same size without per-icon
 * nudging. That only holds if nobody hand-rolls paths: before this module the
 * app carried nine inline `<path d="...">` glyphs and, between those and the
 * two Hugeicons ticks in use, *five different checkmarks* — three of them
 * drawn slightly differently by hand.
 *
 * So: recurring glyphs live here under a semantic name, and every site imports
 * the name rather than picking a variant. One-off glyphs (HouseHeart, Camera,
 * Sun, …) keep their direct import — the point is to pin the shared ones, not
 * to funnel all 13k icons through a barrel.
 */

export {
  // The tick, bare — for use inside something that already provides the shape
  // (a filled chip, a pill, a selection ring). 14×11 on the grid.
  Tick02Icon as TickIcon,
  // The tick, enclosed in its own disc — for use standing alone on a surface,
  // where a bare tick has nothing to read against. 20×20, matching DropletIcon's
  // 20 height so the two sit as equals when they share a slot.
  CheckmarkCircle02Icon as TickCircleIcon,
  // Disclosure chevron: accordion headers, dropdown triggers. Rotate for state.
  ArrowDown01Icon as ChevronDownIcon,
  // Back affordance in page headers.
  ArrowLeft01Icon as ChevronLeftIcon,
  // Dismiss — lightboxes, sheets.
  Cancel01Icon as CloseIcon,
  // Add — the header's add-plant control, "New room", "New household".
  PlusSignIcon as AddIcon,
  // Water, everywhere it appears: care sheet, timeline, grid badge.
  DropletIcon,
} from "@hugeicons/core-free-icons";

/**
 * The three icon size rungs, mirroring the 36/40/44 button ladder in `ui.ts`.
 * Pick by what the glyph sits next to, not by how important it feels:
 *
 *   16  `ICON_SM` — inline with `text-sm` body copy, and inside small chips and
 *       pills (room chips, room headers, the care-sheet action pills).
 *   18  `ICON_MD` — the default. Standalone controls, list rows, and the
 *       interior of every 36px `buttonIcon`.
 *   26  `ICON_LG` — feature glyphs that anchor a header or an empty state.
 *
 * Sizes between rungs (the 13/15/17 this replaced) read as accidents rather
 * than intent, and they stack up: a 17px glyph beside a 16px one in the same
 * row is just slightly wrong with no way to tell which is correct.
 */
export const ICON_SM = 16;
export const ICON_MD = 18;
export const ICON_LG = 26;
