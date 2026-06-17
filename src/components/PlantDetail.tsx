"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { STATUS_LABEL } from "@/lib/care-display";
import { SHOW_FEED } from "@/lib/features";
import type { CareState } from "@/lib/status";

export type PlantDetailData = {
  id: string;
  name: string;
  room: string | null;
  avatar: string | null;
  commonName: string | null;
  notes: string | null;
  waterNote: string | null;
  lightNote: string | null;
  feedNote: string | null;
  water: CareState;
  feed: CareState;
};

const DAY_MS = 86_400_000;

/** Relative "last done" label, e.g. "today", "3 days ago". Computed only after
 * mount to avoid SSR/client hydration mismatches on the current time. */
function agoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.round((Date.now() - Date.parse(iso)) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function dueLabel(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.round((Date.parse(iso) - Date.now()) / DAY_MS);
  if (days === 0) return "due today";
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  return `due in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The care detail for one plant, shown all on one screen (no tabs): the water
 * card with its Mark-watered action, the light guidance, and personal notes.
 * (Feed is hidden behind SHOW_FEED.)
 */
export function PlantDetail({
  token,
  initial,
}: {
  token: string;
  initial: PlantDetailData;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [pending, setPending] = useState<null | "water" | "feed">(null);
  const [justDid, setJustDid] = useState<null | "water" | "feed">(null);
  // false during SSR, true once hydrated — gates time-relative labels so the
  // server and client render the same thing initially.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  async function mark(kind: "water" | "feed") {
    setPending(kind);
    try {
      const res = await fetch(`/api/h/${token}/plants/${data.id}/${kind}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const { plant } = await res.json();
      // Optimistically reflect the new status immediately.
      setData((d) => ({ ...d, water: plant.water, feed: plant.feed }));
      setJustDid(kind);
      setTimeout(() => setJustDid(null), 2000);
      // Keep the home screen / server data in sync.
      router.refresh();
    } catch {
      // Leave state unchanged on failure; a toast system arrives in polish.
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CareCard
        accent="text-water"
        title="Water"
        note={data.waterNote}
        care={data.water}
        mounted={mounted}
        action={{
          label: "Mark watered",
          doneLabel: "Watered",
          bg: "bg-water",
          pending: pending === "water",
          done: justDid === "water",
          onClick: () => mark("water"),
        }}
      />

      {SHOW_FEED ? (
        <CareCard
          accent="text-feed"
          title="Feed"
          note={data.feedNote}
          care={data.feed}
          mounted={mounted}
          action={{
            label: "Mark fed",
            doneLabel: "Fed",
            bg: "bg-feed",
            pending: pending === "feed",
            done: justDid === "feed",
            onClick: () => mark("feed"),
          }}
        />
      ) : null}

      <div className="rounded-3xl bg-surface p-5 text-ink">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-light">
          Light
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink">
          {data.lightNote ?? "No light guidance for this plant yet."}
        </p>
      </div>

      <div className="rounded-3xl bg-surface/90 p-5 text-ink">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Your notes
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink">
          {data.notes ?? (
            <span className="text-ink-soft">
              No personal notes yet. (Editing arrives in a later step.)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function CareCard({
  accent,
  title,
  note,
  care,
  mounted,
  action,
}: {
  accent: string;
  title: string;
  note: string | null;
  care: CareState;
  mounted: boolean;
  action: {
    label: string;
    doneLabel: string;
    bg: string;
    pending: boolean;
    done: boolean;
    onClick: () => void;
  };
}) {
  const reduce = useReducedMotion();
  const last = mounted ? agoLabel(care.lastDoneAt) : null;
  const due = mounted ? dueLabel(care.dueAt) : null;

  return (
    <div className="rounded-3xl bg-surface p-5 text-ink">
      <div className="flex items-center justify-between">
        <h2
          className={`text-sm font-semibold uppercase tracking-wide ${accent}`}
        >
          {title}
        </h2>
        {care.status ? (
          <span className={`text-xs font-medium ${accent}`}>
            {STATUS_LABEL[care.status]}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-base leading-relaxed text-ink">
        {note ?? "No guidance for this plant yet."}
      </p>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
        <div>
          <dt className="inline">Last: </dt>
          <dd className="inline font-medium text-ink">
            {last ?? (care.lastDoneAt ? "—" : "not yet")}
          </dd>
        </div>
        {care.intervalDays ? (
          <div>
            <dt className="inline">Every </dt>
            <dd className="inline font-medium text-ink">
              {care.intervalDays} days
            </dd>
          </div>
        ) : null}
        {due ? (
          <div>
            <dd className="font-medium text-ink">{due}</dd>
          </div>
        ) : null}
      </dl>

      <motion.button
        type="button"
        onClick={action.onClick}
        disabled={action.pending || action.done}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold text-canvas transition-colors duration-500 disabled:opacity-90 ${
          action.done ? "bg-healthy" : action.bg
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {action.pending ? (
            <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              …
            </motion.span>
          ) : action.done ? (
            <motion.span
              key="done"
              className="flex items-center gap-2"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 16 }}
              >
                <path
                  d="M5 12.5l4 4 10-10"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
              {action.doneLabel}
            </motion.span>
          ) : (
            <motion.span key="label" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {action.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
