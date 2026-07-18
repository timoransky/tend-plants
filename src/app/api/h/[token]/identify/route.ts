import type { NextRequest } from "next/server";

import { apiError, findHousehold, json } from "@/lib/api";
import { identifyPlant, IdentifyError, isIdentifyEnabled } from "@/lib/identify";

/**
 * POST /api/h/[token]/identify — identify a houseplant from an uploaded photo,
 * returning ranked candidates (see {@link identifyPlant}). The add-plant flow
 * opens the matched species' form pre-filled, as tapping a search result does.
 *
 * Unlike the static `/api/species` routes, identify makes an expensive external
 * call, so it's gated behind the household token like every other data route:
 * the unguessable link is the permission. A request without a valid token 404s
 * before any Pl@ntNet call — closing the endpoint to crawlers and anonymous
 * abuse that could otherwise burn the shared identification quota.
 *
 * Also optional overall: with no `PLANTNET_API_KEY` set it returns 503 and the
 * UI never shows the entry point.
 */

// Give the identification call headroom on serverless platforms (Vercel reads this).
export const maxDuration = 30;

// Pl@ntNet accepts JPG/PNG. The client downscales to JPEG before upload, so the
// normal path is always image/jpeg; PNG covers the rare no-downscale fallback.
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

// The client downscales to a ~200–400 KB JPEG before upload, so anything much
// bigger is unexpected — cap tightly to bound bandwidth/decoding on abuse.
const MAX_BYTES = 2 * 1024 * 1024;

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isIdentifyEnabled()) {
    return apiError(503, "Photo identification is not configured.");
  }

  // Capability check first — no valid household token, no expensive call.
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) return apiError(404, "Household not found");

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
