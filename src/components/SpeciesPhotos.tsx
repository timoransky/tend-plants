"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

import { tapScale } from "@/lib/ui";

/**
 * The reference-photo strip in the add-plant form: a row of thumbnails that
 * enlarge into a full-screen lightbox when tapped, so someone can eyeball
 * whether it's really their plant. With more than one photo the lightbox pages
 * with prev/next and shows a position counter.
 *
 * The lightbox is a Radix Dialog (the same primitive vaul is built on). The form
 * lives inside a vaul drawer, so the lightbox must join Radix's layer stack —
 * otherwise a tap or Escape that closes it would also dismiss the drawer
 * underneath. Mirrors PlantPhotoAvatar's lightbox styling.
 */
export function SpeciesPhotos({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const fade = { duration: reduce ? 0 : 0.2, ease: "easeOut" } as const;
  const count = images.length;

  if (count === 0) return null;

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {images.map((src, i) => (
          <Dialog.Trigger
            key={src}
            onClick={() => openAt(i)}
            aria-label={`Enlarge ${alt} photo ${i + 1}`}
            className={`shrink-0 cursor-zoom-in rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-water ${tapScale}`}
          >
            <Image
              src={src}
              alt={`${alt} — reference photo ${i + 1}`}
              width={112}
              height={112}
              className="size-24 rounded-xl object-cover"
            />
          </Dialog.Trigger>
        ))}
      </div>

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

            {/* Tapping the surface (backdrop or photo) closes it; the nav and
                Close controls stop propagation so they don't. */}
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
                <Dialog.Title className="sr-only">
                  {alt} — photo {index + 1} of {count}
                </Dialog.Title>

                <motion.img
                  src={images[index]}
                  alt={`${alt} — reference photo ${index + 1}`}
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

                {count > 1 ? (
                  <>
                    <NavButton
                      side="left"
                      onClick={(e) => {
                        e.stopPropagation();
                        step(-1);
                      }}
                    />
                    <NavButton
                      side="right"
                      onClick={(e) => {
                        e.stopPropagation();
                        step(1);
                      }}
                    />
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-canvas-soft/80 px-3 py-1 text-xs font-medium text-cream backdrop-blur-sm"
                    >
                      {index + 1} / {count}
                    </div>
                  </>
                ) : null}

                <Dialog.Close
                  aria-label="Close photo"
                  className={`absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-canvas-soft/80 text-cream outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cream hover:bg-canvas-soft ${tapScale}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function NavButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-3" : "right-3"} flex size-10 items-center justify-center rounded-full bg-canvas-soft/80 text-cream outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cream hover:bg-canvas-soft ${tapScale}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={side === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
