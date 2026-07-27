"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { PlantAvatar } from "@/components/PlantAvatar";
import { buttonIcon, tapScale } from "@/lib/ui";

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
      <Dialog.Trigger
        aria-label={`Enlarge photo of ${alt}`}
        className={`${className} cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-water ${tapScale}`}
      >
        <PlantAvatar avatar={avatar} imageUrl={imageUrl} alt={alt} />
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
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
