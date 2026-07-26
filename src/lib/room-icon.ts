import {
  Bathtub01Icon,
  BedDoubleIcon,
  ChefHatIcon,
  DiningTableIcon,
  DoorIcon,
  GarageIcon,
  Home01Icon,
  House01Icon,
  KidIcon,
  LaptopIcon,
  Leaf01Icon,
  Sofa03Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

// The shared shape of every Hugeicons icon (the package doesn't re-export its
// `RoomIcon` type, so derive it from one icon).
type RoomIcon = typeof Home01Icon;

/**
 * Auto-matched line icon for a room, from its free-text name. A tiny keyword
 * matcher (English + Slovak) so room headers and chips get a friendly glyph
 * without a rooms table or per-room config. Returns a Hugeicons icon; render it
 * with <HugeiconsIcon icon={roomIcon(room)} />.
 *
 * Pure data module — no `"use client"`, no db import — so it's shared by server
 * pages AND client components.
 */

/** Lowercase and strip diacritics, so "Kúpeľňa" folds to "kupelna". */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Ordered [keywords, icon] rules; first folded-substring match wins. Keywords
// cover English + Slovak stems (folded, so accents needn't be listed).
const RULES: readonly [readonly string[], RoomIcon][] = [
  [["living", "obyva"], Sofa03Icon],
  [["kitchen", "kuchyn"], ChefHatIcon],
  [["bath", "kupel"], Bathtub01Icon],
  [["bedroom", "spaln"], BedDoubleIcon],
  [["dining", "jedal"], DiningTableIcon],
  [["office", "pracov", "kancelar", "study"], LaptopIcon],
  [["balcon", "balkon", "terrace", "teras"], Sun03Icon],
  [["hall", "chodb", "predsien", "entry"], DoorIcon],
  [["kids", "nursery", "detsk"], KidIcon],
  [["garden", "zahrad", "sklenik"], Leaf01Icon],
  [["garage", "garaz"], GarageIcon],
];

/**
 * Icon for a room name. `null` (the "Everywhere else" group) → a whole-home
 * glyph; a name with no keyword match → a generic house (distinct from the
 * plant fallback used on avatars).
 */
export function roomIcon(room: string | null): RoomIcon {
  if (room == null) return Home01Icon;
  const folded = fold(room);
  for (const [keywords, icon] of RULES) {
    if (keywords.some((k) => folded.includes(k))) return icon;
  }
  return House01Icon;
}
