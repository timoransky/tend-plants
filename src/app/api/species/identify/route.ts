import type { NextRequest } from "next/server";

import { apiError, json } from "@/lib/api";
import {
  identifyPlant,
  isIdentifyEnabled,
  type ImageMediaType,
} from "@/lib/identify";

/**
 * POST /api/species/identify — identify a houseplant from an uploaded photo.
 *
 * The photo-by-name sibling of `/api/species`: same job (land on a dataset
 * species), different input. Stateless and household-agnostic — no token, no DB
 * write. Takes a multipart form with an `image` field and returns
 * `{ result }` (see {@link identifyPlant}); the add-plant flow then opens the
 * matched species' form pre-filled, exactly as tapping a search result does.
 *
 * The whole feature is optional: with no `ANTHROPIC_API_KEY` set it returns 503
 * and the UI never shows the entry point.
 */

// Give the vision call headroom on serverless platforms (Vercel reads this).
export const maxDuration = 30;

const ALLOWED_TYPES: readonly ImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// The client downscales before upload (~a few hundred KB), so anything larger
// is unexpected — cap it so a stray full-res photo can't blow up the request.
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isIdentifyEnabled()) {
    return apiError(503, "Photo identification is not configured.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "Expected a multipart form upload.");
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return apiError(400, "Missing image.");
  }

  const mediaType = ALLOWED_TYPES.find((t) => t === image.type);
  if (!mediaType) {
    return apiError(415, "Unsupported image type. Use JPEG, PNG, WebP or GIF.");
  }
  if (image.size > MAX_BYTES) {
    return apiError(413, "Image is too large.");
  }

  const data = Buffer.from(await image.arrayBuffer()).toString("base64");

  try {
    const result = await identifyPlant({ data, mediaType });
    return json({ result });
  } catch (err) {
    console.error("Plant identification failed:", err);
    return apiError(502, "Identification failed. Please try again.");
  }
}
