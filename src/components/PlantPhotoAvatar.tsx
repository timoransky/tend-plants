"use client";

import { SearchAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { PlantAvatar } from "@/components/PlantAvatar";
import { buttonIcon, tapScale } from "@/lib/ui";
import { CloseIcon, ICON_MD } from "@/lib/icons";

/**
 * A plant avatar that enlarges its photo when tapped. With an uploaded photo it
 * becomes a button that opens the photo full-screen in a lightbox; an emoji-only
 * avatar has nothing to enlarge, so it falls back to a plain, non-interactive
 * avatar. Drop-in for the sized/rounded avatar frame — pass the same className
 * the frame `<span>` used.
 *
 * The lightbox is a Radix Dialog (the same primitive vaul is built on). The plant
 * detail lives inside a vaul drawer, so the lightbox must join Radix's layer
 * stack — otherwise a tap or Escape that closes it would also dismiss the drawer
 * underneath. Nesting a Dialog does exactly that: Radix registers it as the top
 * layer, so it alone owns outside-clicks / Escape / the focus trap, and we get
 * portalling (escaping the drawer's transform), the modal `pointer-events`
 * dance, and focus restore for free. Framer Motion drives the enter/exit via
 * forceMount + AnimatePresence, matching the app's reduced-motion handling.
 *
 * A zoom button marks the photo as enlargeable. It has to be there without a
 * pointer — `cursor-zoom-in` alone leaves the feature invisible on a phone — so
 * it's persistent, and hover only deepens it. Centred, not tucked in a corner: a
 * corner badge reads as a sticker and lands wherever the photo's subject happens
 * to be, while the middle is symmetric at any avatar size and stays clear of the
 * status dot the plant page hangs at bottom-right. It carries its own contrast,
 * so the photo never needs a permanent veil — a bare glyph would need a ~55%
 * scrim over the whole circle to stay legible on a bright photo.
 */
export function PlantPhotoAvatar({
  avatar,
  imageUrl,
  alt,
  className,
}: {
  avatar: string | null;
  imageUrl: string | null;
  alt: string;
  className: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const fade = { duration: reduce ? 0 : 0.2, ease: "easeOut" } as const;

  // Emoji-only avatars have nothing to enlarge — render a plain, static avatar.
  if (!imageUrl) {
    return (
      <span className={className}>
        <PlantAvatar avatar={avatar} imageUrl={imageUrl} alt={alt} />
      </span>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* The group is named because `className` is caller-supplied — a bare
          `group` could be captured by an ancestor that already uses one. The
          hint layers carry their own transition-colors; `tapScale` owns the
          trigger's transition-property and must not share it. */}
      <Dialog.Trigger
        aria-label={`Enlarge photo of ${alt}`}
        className={`${className} group/zoom relative cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-water ${tapScale}`}
      >
        <PlantAvatar avatar={avatar} imageUrl={imageUrl} alt={alt} />

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-scrim/0 transition-colors duration-200 ease-out group-hover/zoom:bg-scrim/25"
        >
          {/* Sized and shaped like the header's circular icon buttons (share,
              back): size-9, hairline cream border, cream glyph at 17/1.7. The
              fill is inverted, though — `neutralButton`'s faint cream tint is
              documented dark-canvas-only, and here the backdrop is a photo of
              any brightness.

              It darkens rather than covers: `backdrop-brightness` scales the
              photo down *proportionally*, so the photo keeps showing through
              while the glyph stays legible over any of it. A flat scrim can't do
              both — the opacity that survives white is an opaque disc over
              everything else. 0.4 is chosen so even a blown-out white pixel
              directly behind a stroke lands near 5:1, which is also why there's
              no backdrop-blur: at 36px even a 4px blur smears the photo into a
              flat disc, and the contrast is already guaranteed without it. The
              tint is a floor for when backdrop-filter is unsupported, and the
              one thing hover animates (transition-colors can't tween a filter). */}
          <span className="flex size-9 items-center justify-center rounded-full border border-cream/20 bg-scrim/10 text-cream backdrop-brightness-[0.4] transition-colors duration-200 ease-out group-hover/zoom:bg-scrim/30">
            <HugeiconsIcon
              icon={SearchAddIcon}
              size={ICON_MD}
              strokeWidth={1.7}
              aria-hidden
            />
          </span>
        </span>
      </Dialog.Trigger>

      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fade}
                className="fixed inset-0 z-[100] bg-scrim/80 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* Tapping anywhere on the surface (backdrop or photo) closes it; the
                Close button and Escape do too. aria-describedby={undefined} opts
                out of Radix's description warning — the Title is the whole name. */}
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              onClick={() => setOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fade}
                className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center p-6"
              >
                <Dialog.Title className="sr-only">Photo of {alt}</Dialog.Title>

                {/* motion.img (not <img>) so the enlarge animates; alt carries
                    the plant name for assistive tech. */}
                <motion.img
                  src={imageUrl}
                  alt={alt}
                  draggable={false}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 300, damping: 30 }
                  }
                  className="max-h-[85dvh] max-w-full rounded-3xl object-contain shadow-2xl"
                />

                <Dialog.Close
                  aria-label="Close photo"
                  className={`${buttonIcon} absolute right-4 top-4 bg-canvas-soft/80 text-cream outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cream hover:bg-canvas-soft ${tapScale}`}
                >
                  <HugeiconsIcon
                    icon={CloseIcon}
                    size={ICON_MD}
                    strokeWidth={2}
                    aria-hidden
                  />
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
