import Anthropic from "@anthropic-ai/sdk";

import { FALLBACK_SPECIES } from "@/data/fallback-species";

/**
 * Server-only plant identification from a photo, powered by Claude vision.
 *
 * This is the one AI touch-point in the app and it stays deliberately narrow:
 * image in → a species `key` from our own {@link FALLBACK_SPECIES} dataset out
 * (or "" when the plant isn't in the list). It never invents care data — the
 * add-plant flow snapshots care fields from the matched dataset entry exactly as
 * it does for a hand-picked species, so identification is just a faster way to
 * land on the same picker result.
 *
 * The whole feature is gated behind `ANTHROPIC_API_KEY`: with no key set,
 * {@link isIdentifyEnabled} is false, the UI hides the entry point, and the
 * route returns 503. The key is server-side only and never reaches the browser.
 */

/** The four base64 image types the Claude vision API accepts. */
export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export type IdentifyResult = {
  /** False when the photo isn't a houseplant at all (a pet, a wall, a face…). */
  isPlant: boolean;
  /**
   * Best-matching key from {@link FALLBACK_SPECIES}, or "" when the plant is
   * real but not in our dataset (the caller then falls back to manual entry).
   * Constrained to a valid key by the response schema — never a hallucination.
   */
  speciesKey: string;
  /** Common name of the identified plant, even when it isn't in the dataset. */
  commonName: string;
  confidence: "high" | "medium" | "low";
  /** One short, friendly sentence about the identification (for future UI use). */
  note: string;
};

/** Whether photo identification is configured (an API key is present). */
export function isIdentifyEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Default to the flagship model. Swap to "claude-haiku-4-5" for a cheaper,
// faster identify (plenty capable for this classification) — it's a one-line
// change with no other edits needed.
const MODEL = "claude-opus-4-8";

// The dataset drives the response schema and the prompt, so the two can never
// drift: the enum guarantees Claude returns a real key, and the catalog tells
// it which key maps to which plant.
const SPECIES_KEYS = FALLBACK_SPECIES.map((s) => s.key);
const CATALOG = FALLBACK_SPECIES.map((s) => `${s.key}: ${s.commonName}`).join(
  "\n",
);

/**
 * Structured-output schema. `speciesKey` is an enum of every dataset key plus
 * "" (not-in-dataset), so the model can only return a value the add flow can
 * actually resolve. `confidence` is a small vocabulary rather than a number.
 */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isPlant: {
      type: "boolean",
      description: "True only if the photo shows a houseplant.",
    },
    speciesKey: {
      type: "string",
      enum: [...SPECIES_KEYS, ""],
      description:
        'The catalog key of the best match, or "" if the plant is not in the catalog.',
    },
    commonName: {
      type: "string",
      description:
        "The plant's common name (fill this in even when speciesKey is empty).",
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    note: {
      type: "string",
      description: "One short, friendly sentence about the identification.",
    },
  },
  required: ["isPlant", "speciesKey", "commonName", "confidence", "note"],
} as const;

const SYSTEM = `You identify common houseplants from a single photo for a plant-care app.

Return your answer in the required JSON format:
- If the image is not a houseplant (a person, pet, food, empty room, etc.), set isPlant to false and leave speciesKey "".
- Otherwise identify the plant. If it matches an entry in the catalog below, set speciesKey to that entry's key. If it's a real houseplant but not in the catalog, set speciesKey to "" and still fill in commonName.
- Always fill in commonName with your best identification, even at low confidence.
- Set confidence honestly based on image clarity and how sure you are.
- Keep note to one short, friendly sentence.

Catalog (key: name):
${CATALOG}`;

// One lazily-constructed client, reused across requests. The constructor reads
// ANTHROPIC_API_KEY from the environment.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  return (client ??= new Anthropic());
}

/**
 * Identify the plant in a base64-encoded image. Throws if the API call fails or
 * the response can't be parsed; callers surface a retry-able error to the user.
 */
export async function identifyPlant(image: {
  data: string;
  mediaType: ImageMediaType;
}): Promise<IdentifyResult> {
  // Small JSON output, so a single non-streaming call is well under any timeout.
  // Thinking is left off (fast, and structured output keeps the reply to the
  // schema — no room to ramble).
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.data,
            },
          },
          { type: "text", text: "Identify the houseplant in this photo." },
        ],
      },
    ],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Identification response had no text content");
  }
  return JSON.parse(block.text) as IdentifyResult;
}
