import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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
 *   STORAGE_PUBLIC_URL_BASE   where objects are publicly served from, e.g.
 *                             https://<ref>.supabase.co/storage/v1/object/public/plant-avatars
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
const PUBLIC_URL_BASE = process.env.STORAGE_PUBLIC_URL_BASE;

/** Whether object storage is configured (all required vars present). */
export function isStorageEnabled(): boolean {
  return Boolean(
    ENDPOINT &&
      REGION &&
      BUCKET &&
      ACCESS_KEY_ID &&
      SECRET_ACCESS_KEY &&
      PUBLIC_URL_BASE,
  );
}

// Built lazily on first use, then reused across invocations. `forcePathStyle`
// is required for S3-compatible providers like Supabase/MinIO (which don't do
// virtual-hosted-style bucket subdomains).
let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
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
  await s3().send(
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
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error("Failed to delete storage object", key, err);
  }
}

/**
 * Public URL for an object key, derived from `STORAGE_PUBLIC_URL_BASE` at read
 * time. Storing the *key* (not this URL) in the DB is what keeps the provider
 * swappable — the serving host can change with no data migration. Returns null
 * when storage isn't configured.
 */
export function publicUrl(key: string): string | null {
  if (!PUBLIC_URL_BASE) return null;
  return `${PUBLIC_URL_BASE.replace(/\/+$/, "")}/${key}`;
}
