/**
 * The inner content of a plant's avatar: an uploaded photo when the plant has
 * one, otherwise its emoji (falling back to a pot). Meant to sit inside the
 * caller's already-sized, rounded, coloured frame — it only decides
 * photo-vs-emoji, so every avatar surface (home grid, detail, form, sheets)
 * stays visually identical and gains photos in one place.
 *
 * The frame's shape is the caller's call: photos default to `rounded-full` (the
 * circular avatar used almost everywhere), but the home grid passes its own
 * `imgClassName` to fill a rounded-square tile instead. Emoji are always
 * centred by the frame, so they need no shape awareness here.
 *
 * Plain component (no hooks / "use client") so it renders in server components
 * too, e.g. the plant detail page.
 */
export function PlantAvatar({
  avatar,
  imageUrl,
  alt = "",
  imgClassName = "rounded-full",
}: {
  avatar: string | null;
  imageUrl: string | null;
  alt?: string;
  imgClassName?: string;
}) {
  if (imageUrl) {
    return (
      // Plain <img>, not next/image: avatars are already downscaled client-side
      // and served from a configurable public bucket, so this avoids coupling
      // next.config's remotePatterns to the storage host. Fills and is clipped
      // to the parent frame.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className={`size-full object-cover ${imgClassName}`}
      />
    );
  }
  return <span aria-hidden>{avatar ?? "🪴"}</span>;
}
