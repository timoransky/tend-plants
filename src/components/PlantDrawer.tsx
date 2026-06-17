"use client";

import { motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { PlantDetail, type PlantDetailData } from "@/components/PlantDetail";
import type { PlantWithStatus } from "@/lib/plants";

function toDetailData(p: PlantWithStatus): PlantDetailData {
  return {
    id: p.id,
    name: p.name,
    room: p.room,
    avatar: p.avatar,
    commonName: p.commonName,
    notes: p.notes,
    waterNote: p.waterNote,
    lightNote: p.lightNote,
    feedNote: p.feedNote,
    water: p.water,
    feed: p.feed,
  };
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])';

/**
 * Bottom-sheet detail drawer. The tapped bubble's avatar flies up into the
 * header via a shared `layoutId`; the panel rises and fades behind a scrim and
 * can be dragged down (from the handle) to dismiss. Body is the existing
 * PlantDetail, so Mark-watered keeps working and refreshes the garden.
 *
 * Mounted/unmounted by a parent <AnimatePresence>.
 */
export function PlantDrawer({
  plant,
  token,
  onClose,
}: {
  plant: PlantWithStatus;
  token: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Scroll-lock, move focus in, trap Tab, Esc to close, restore focus on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${plant.name} care`}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-canvas shadow-2xl shadow-black/40 outline-none"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
        transition={
          reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 36 }
        }
        drag={reduce ? false : "y"}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.5}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 300) onClose();
        }}
      >
        {/* Drag handle — only the handle starts a drag, so the body scrolls. */}
        <div
          onPointerDown={(e) => {
            if (!reduce) dragControls.start(e);
          }}
          className="flex shrink-0 touch-none cursor-grab justify-center py-3 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-cream-soft/30" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          <header className="flex flex-col items-center gap-3 pb-5 pt-1 text-center">
            <motion.span
              layoutId={`plant-avatar-${plant.id}`}
              className="flex size-24 items-center justify-center rounded-full bg-surface text-5xl shadow-sm"
            >
              <span aria-hidden>{plant.avatar ?? "🪴"}</span>
            </motion.span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-cream">
                {plant.name}
              </h1>
              <p className="text-sm text-cream-soft">
                {[plant.room, plant.commonName].filter(Boolean).join(" · ") ||
                  "Houseplant"}
              </p>
            </div>
          </header>

          <PlantDetail token={token} initial={toDetailData(plant)} />
        </div>
      </motion.div>
    </>
  );
}
