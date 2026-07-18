import type { NextRequest } from "next/server";

import { apiError, json } from "@/lib/api";
import { identifyPlant, IdentifyError, isIdentifyEnabled } from "@/lib/identify";

/**
 * POST /api/species/identify — identify a houseplant from an uploaded photo.
 *
 * The photo-by-name sibling of `/api/species`: same job (land on a dataset
 * species), different input. Stateless and household-agnostic — no token, no DB
 * write. Takes a multipart form with an `image` field and returns `{ result }`
 * (see {@link identifyPlant}); the add-plant flow then opens the matched
 * species' form pre-filled, exactly as tapping a search result does.
 *
 * The whole feature is optional: with no `PLANTNET_API_KEY` set it returns 503
 * and the UI never shows the entry point.
 */

// Give the identification call headroom on serverless platforms (Vercel reads this).
export const maxDuration = 30;

// Pl@ntNet accepts JPG/PNG. The client downscales to JPEG before upload, so the
// normal path is always image/jpeg; PNG covers the rare no-downscale fallback.
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

// The client downscales before upload (~a few hundred KB), so anything larger is
// unexpected — cap it so a stray full-res photo can't blow up the request.
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
  if (!ALLOWED_TYPES.includes(image.type)) {
    return apiError(415, "Unsupported image type. Use a JPEG or PNG photo.");
  }
  if (image.size > MAX_BYTES) {
    return apiError(413, "Image is too large.");
  }

  try {
    const result = await identifyPlant({
      blob: image,
      filename: image.name || "plant.jpg",
    });
    return json({ result });
  } catch (err) {
    if (err instanceof IdentifyError) {
      return apiError(err.status, err.userMessage);
    }
    console.error("Plant identification failed:", err);
    return apiError(502, "Identification failed. Please try again.");
  }
}
