import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";

import { apiError, findHousehold, json } from "@/lib/api";
import { isStorageEnabled, publicUrl, putObject } from "@/lib/storage";

/**
 * POST /api/h/[token]/avatar — upload a photo to use as a plant's avatar.
 *
 * Returns `{ key, url }`: the client keeps the `key` in the plant form and
 * sends it on save (stored in `plants.avatar_image_key`); `url` is just for an
 * immediate preview. The plant row, not this response, is the source of truth.
 *
 * Gated behind the household token like every other data route — the unguessable
 * link is the permission, so anonymous callers can't burn storage. Optional
 * overall: with storage unconfigured it 503s and the UI never offers the entry
 * point (mirrors the identify route).
 */

export const maxDuration = 30;

// The client downscales to JPEG before upload; PNG/WebP cover the rare
// no-downscale fallback (e.g. a browser that can't decode the source).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Avatars are downscaled to ~1024px before upload, so anything much larger is
// unexpected — cap to bound bandwidth/memory on abuse.
const MAX_BYTES = 5 * 1024 * 1024;

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isStorageEnabled()) {
    return apiError(503, "Photo uploads are not configured.");
  }

  // Capability check first — no valid household token, no upload.
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
    return apiError(415, "Unsupported image type. Use a JPEG, PNG or WebP.");
  }
  if (image.size > MAX_BYTES) {
    return apiError(413, "Image is too large.");
  }

  // Random, household-agnostic key: the object is served from a public URL, so
  // the key must not be guessable and must not encode the household token.
  const key = `avatars/${nanoid()}.${EXTENSION[image.type]}`;

  try {
    const bytes = new Uint8Array(await image.arrayBuffer());
    await putObject(key, bytes, image.type);
  } catch (err) {
    console.error("Avatar upload failed:", err);
    return apiError(502, "Upload failed. Please try again.");
  }

  return json({ key, url: publicUrl(key) }, { status: 201 });
}
