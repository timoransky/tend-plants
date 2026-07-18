"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { PlantAvatar } from "@/components/PlantAvatar";
import { tapScale } from "@/lib/ui";

/**
 * A plant avatar that enlarges its photo when tapped. When the plant has an
 * uploaded photo it renders as a button that opens the photo full-screen in a
 * lightbox; an emoji-only avatar has nothing to enlarge, so it falls back to a
 * plain, non-interactive avatar. Drop-in for the sized/rounded avatar frame —
 * pass the same className the frame `<span>` used.
 *
 * The lightbox is portalled to <body> so it escapes any transformed ancestor:
 * a `position: fixed` element inside a transformed subtree (e.g. vaul's drawer
 * content, which is transformed while dragging) is positioned relative to that
 * subtree, not the viewport, which would break the full-screen overlay. Sitting
 * outside the drawer's tree also means the drawer's own dismiss handlers would
 * fire on the lightbox's Escape / outside-tap, so both are stopped here (see the
 * effect and the overlay's onPointerDown) — closing the lightbox must not also
 * close the drawer underneath.
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
  // false during SSR, true once hydrated — portals need `document`, so gate the
  // portal on this (same idiom as PlantDetail's time-relative labels).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    // Capture phase + stopImmediatePropagation so this runs before (and hides
    // the key from) any drawer that also closes on Escape — only the lightbox
    // should close.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Emoji-only avatars have nothing to enlarge — render a plain, static avatar.
  if (!imageUrl) {
    return (
      <span className={className}>
        <PlantAvatar avatar={avatar} imageUrl={imageUrl} alt={alt} />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge photo of ${alt}`}
        className={`${className} cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-water ${tapScale}`}
      >
        <PlantAvatar avatar={avatar} imageUrl={imageUrl} alt={alt} />
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Photo of ${alt}`}
                  onClick={() => setOpen(false)}
                  // Keep the tap from reaching the drawer's pointer-outside
                  // dismiss (vaul/Radix listens on document) — see the header
                  // note. React (Next's App Router) delegates events at document
                  // and registers before Radix mounts, so stopping the native
                  // event's immediate propagation skips Radix's same-node
                  // listener while our own onClick (a separate click event) still
                  // fires to close the lightbox.
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-scrim/80 p-6 backdrop-blur-sm"
                >
                  {/* motion.img (not <img>) so the enlarge animates; alt carries
                      the plant name for assistive tech. */}
                  <motion.img
                    src={imageUrl}
                    alt={alt}
                    draggable={false}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="max-h-[85dvh] max-w-full rounded-3xl object-contain shadow-2xl"
                  />

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close photo"
                    className={`absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-canvas-soft/80 text-cream outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-cream hover:bg-canvas-soft ${tapScale}`}
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
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
