/**
 * The inner content of a plant's circular avatar: an uploaded photo when the
 * plant has one, otherwise its emoji (falling back to a pot). Meant to sit
 * inside the caller's already-sized, rounded, coloured circle — it only decides
 * photo-vs-emoji, so every avatar surface (home grid, detail, form, sheets)
 * stays visually identical and gains photos in one place.
 *
 * Plain component (no hooks / "use client") so it renders in server components
 * too, e.g. the plant detail page.
 */
export function PlantAvatar({
  avatar,
  imageUrl,
  alt = "",
}: {
  avatar: string | null;
  imageUrl: string | null;
  alt?: string;
}) {
  if (imageUrl) {
    return (
      // Plain <img>, not next/image: avatars are already downscaled client-side
      // and served from a configurable public bucket, so this avoids coupling
      // next.config's remotePatterns to the storage host. Fills and is clipped
      // to the parent circle.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className="size-full rounded-full object-cover"
      />
    );
  }
  return <span aria-hidden>{avatar ?? "🪴"}</span>;
}
