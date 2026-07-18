/**
 * Client-side image helpers (browser only — uses createImageBitmap/canvas).
 *
 * Shared by the two flows that send a photo to the server: identifying a plant
 * and setting a plant's avatar. Downscaling before upload keeps requests small
 * (faster round-trips, cheaper storage) and normalizes EXIF orientation so a
 * sideways phone photo isn't sent rotated.
 */

/**
 * Downscale an image file to a JPEG no larger than `maxDim`px on its long edge.
 * Rejects if the browser can't decode the file (e.g. HEIC without support) — the
 * caller then falls back to sending the original bytes.
 */
export async function downscaleImage(
  file: File,
  maxDim = 1024,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Image encoding failed")),
        "image/jpeg",
        quality,
      ),
    );
  } finally {
    bitmap.close();
  }
}
