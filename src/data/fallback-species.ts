/**
 * Local fallback species list. Used for dev/offline and whenever Perenual is
 * down or has no data for a chosen species. Each entry has the same care shape
 * we snapshot into a `plants` row, so the add-plant flow can seed a new plant
 * from one of these without any API call.
 */
export type FallbackSpecies = {
  /** Stable key for this fallback entry (not a Perenual species id). */
  key: string;
  commonName: string;
  /** Default emoji avatar; the user can change it. */
  avatar: string;
  waterIntervalDays: number;
  waterNote: string;
  lightNote: string;
  feedIntervalDays: number;
  feedNote: string;
};

export const FALLBACK_SPECIES: FallbackSpecies[] = [
  {
    key: "monstera",
    commonName: "Monstera",
    avatar: "🌿",
    waterIntervalDays: 7,
    waterNote: "Water when the top 2–3cm of soil is dry.",
    lightNote: "Bright, indirect light. Avoid harsh direct sun.",
    feedIntervalDays: 30,
    feedNote: "Feed monthly with balanced fertilizer in spring and summer.",
  },
  {
    key: "calathea",
    commonName: "Calathea",
    avatar: "🪴",
    waterIntervalDays: 5,
    waterNote: "Keep soil lightly moist; likes humidity, hates drying out.",
    lightNote: "Medium, indirect light. Direct sun fades the leaves.",
    feedIntervalDays: 30,
    feedNote: "Feed monthly with diluted fertilizer during growth.",
  },
  {
    key: "aloe",
    commonName: "Aloe Vera",
    avatar: "🌵",
    waterIntervalDays: 14,
    waterNote: "Let the soil dry out fully between waterings.",
    lightNote: "Bright light, including some direct sun.",
    feedIntervalDays: 60,
    feedNote: "Feed sparingly, every couple of months in growing season.",
  },
  {
    key: "fiddle-leaf-fig",
    commonName: "Fiddle Leaf Fig",
    avatar: "🌳",
    waterIntervalDays: 7,
    waterNote: "Water when the top few cm of soil are dry; dislikes soggy roots.",
    lightNote: "Bright, indirect light near a window.",
    feedIntervalDays: 30,
    feedNote: "Feed monthly in spring and summer.",
  },
  {
    key: "pothos",
    commonName: "Pothos",
    avatar: "🍃",
    waterIntervalDays: 10,
    waterNote: "Water when the top of the soil feels dry. Very forgiving.",
    lightNote: "Tolerates low to bright indirect light.",
    feedIntervalDays: 60,
    feedNote: "Feed every couple of months; not a heavy feeder.",
  },
  {
    key: "snake-plant",
    commonName: "Snake Plant",
    avatar: "🌱",
    waterIntervalDays: 14,
    waterNote: "Let it dry out fully; overwatering is the main risk.",
    lightNote: "Anything from low light to bright indirect.",
    feedIntervalDays: 60,
    feedNote: "Feed sparingly during the growing season.",
  },
  {
    key: "zz-plant",
    commonName: "ZZ Plant",
    avatar: "🪴",
    waterIntervalDays: 14,
    waterNote: "Water only when the soil is dry; thrives on neglect.",
    lightNote: "Low to bright indirect light.",
    feedIntervalDays: 60,
    feedNote: "Feed lightly once or twice in the growing season.",
  },
  {
    key: "peace-lily",
    commonName: "Peace Lily",
    avatar: "🌸",
    waterIntervalDays: 5,
    waterNote: "Keep soil moist; it droops dramatically when thirsty.",
    lightNote: "Medium to low indirect light.",
    feedIntervalDays: 45,
    feedNote: "Feed every 6 weeks or so during growth.",
  },
];
