// Type-only, so the SDK is erased at compile time rather than pulled into every
// module that imports this file. `publicUrl` lives here and is used by
// `lib/plants.ts`, so a value import would drag the whole S3 client into the
// module graph of every page that lists plants — parsed and initialised on each
// cold start just to read some env vars and concatenate a URL. The real import
// happens inside the two functions that actually talk to the bucket.
import type { S3Client } from "@aws-sdk/client-s3";

/**
 * Provider-agnostic object storage for plant avatar photos.
 *
 * The app talks S3 — the lingua franca of object stores — so the concrete
 * provider is just configuration. Today that's Supabase Storage (its native S3
 * endpoint); swapping to AWS S3, Cloudflare R2 or MinIO later is a change of
 * environment variables, not code. Nothing here names Supabase.
 *
 * Config (all server-side; the browser never sees these):
 *   STORAGE_ENDPOINT          e.g. https://<ref>.storage.supabase.co/storage/v1/s3
 *   STORAGE_REGION            e.g. eu-central-1
 *   STORAGE_BUCKET            e.g. plant-avatars
 *   STORAGE_ACCESS_KEY_ID     S3 access key id
 *   STORAGE_SECRET_ACCESS_KEY S3 secret access key
 *
 * The public serving URL is derived from the endpoint + bucket (see
 * {@link publicUrl}), so there's no separate URL var to keep in sync.
 *
 * With any of these unset the feature disables itself: {@link isStorageEnabled}
 * is false, the photo-avatar UI hides, uploads 503, and existing plants fall
 * back to their emoji — exactly like the Pl@ntNet key gates identification.
 *
 * We serve avatars from a public URL, so their object keys must be unguessable
 * (a random nanoid, assigned in the upload route). The DB row ties a key to its
 * household; the key itself carries no household reference, so a leaked photo
 * URL can't be walked back to the household token.
 */

const ENDPOINT = process.env.STORAGE_ENDPOINT;
const REGION = process.env.STORAGE_REGION;
const BUCKET = process.env.STORAGE_BUCKET;
const ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY;

/** Whether object storage is configured (all required vars present). */
export function isStorageEnabled(): boolean {
  return Boolean(
    ENDPOINT && REGION && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY,
  );
}

// Built lazily on first use, then reused across invocations. `forcePathStyle`
// is required for S3-compatible providers like Supabase/MinIO (which don't do
// virtual-hosted-style bucket subdomains).
let client: S3Client | null = null;
async function s3(): Promise<S3Client> {
  if (!client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: ACCESS_KEY_ID as string,
        secretAccessKey: SECRET_ACCESS_KEY as string,
      },
    });
  }
  return client;
}

/** Upload bytes under `key`. Throws if storage isn't configured. */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!isStorageEnabled()) {
    throw new Error("Object storage is not configured.");
  }
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3Client = await s3();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Immutable: each key is unique (random), so the object at a key never
      // changes — let browsers and CDNs cache it forever.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/**
 * Best-effort delete: a failure (or unconfigured storage) is swallowed, since a
 * lingering object is harmless clutter and never worth failing the user's
 * actual action (deleting a plant, replacing a photo) over.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!isStorageEnabled()) return;
  try {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3Client = await s3();
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error("Failed to delete storage object", key, err);
  }
}

/**
 * Public URL for an object key, derived from the endpoint + bucket at read time
 * (no separate serving-URL var to keep in sync). Storing the *key* — not this
 * URL — in the DB is what keeps the provider swappable: the serving host is
 * recomputed here, so it can change with no data migration. Returns null when
 * storage isn't configured.
 *
 * Supabase's S3 endpoint (`.../storage/v1/s3`) is *not* the public-read path —
 * public objects are served from `.../storage/v1/object/public/<bucket>` on the
 * same host — so we rewrite the `/s3` suffix. Any other S3-compatible provider
 * (AWS S3, MinIO, …) serves public objects at the standard path-style URL
 * `<endpoint>/<bucket>/<key>`, which is the fallback.
 */
export function publicUrl(key: string): string | null {
  if (!ENDPOINT || !BUCKET) return null;
  const endpoint = ENDPOINT.replace(/\/+$/, "");
  const base = endpoint.endsWith("/s3")
    ? `${endpoint.slice(0, -"/s3".length)}/object/public/${BUCKET}`
    : `${endpoint}/${BUCKET}`;
  return `${base}/${key}`;
}
