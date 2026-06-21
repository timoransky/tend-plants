"use client";

import {
  ClipboardListIcon,
  DropletIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
    <div className="flex flex-col divide-y divide-ink/10 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
      <CareCard
        iconClass="text-water-icon"
        statusClass="text-water-ink"
        icon={DropletIcon}
        title="Water"
        note={data.waterNote}
        care={data.water}
        mounted={mounted}
        action={{
          label: "Mark watered",
          pendingLabel: "Watering…",
          doneLabel: "Watered",
          bg: "bg-water",
          pending: pending === "water",
          done: justDid === "water",
          onClick: () => mark("water"),
        }}
      />

      {SHOW_FEED ? (
        <CareCard
          iconClass="text-feed-icon"
          statusClass="text-feed-ink"
          icon={DropletIcon}
          title="Feed"
          note={data.feedNote}
          care={data.feed}
          mounted={mounted}
          action={{
            label: "Mark fed",
            pendingLabel: "Feeding…",
            doneLabel: "Fed",
            bg: "bg-feed",
            pending: pending === "feed",
            done: justDid === "feed",
            onClick: () => mark("feed"),
          }}
        />
      ) : null}

      <section className="py-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
          <HugeiconsIcon
            icon={Sun03Icon}
            size={18}
            strokeWidth={1.9}
            className="shrink-0 text-light-icon"
            aria-hidden
          />
          Light
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink">
          {data.lightNote ?? "No light guidance for this plant yet."}
        </p>
      </section>

      <section className="py-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          <HugeiconsIcon
            icon={ClipboardListIcon}
            size={18}
            strokeWidth={1.8}
            className="shrink-0 text-ink-soft"
            aria-hidden
          />
          Your notes
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink">
          {data.notes ?? (
            <span className="text-ink-soft">No personal notes yet.</span>
          )}
        </p>
      </section>
    </div>
  );
}

function CareCard({
  iconClass,
  statusClass,
  icon,
  title,
  note,
  care,
  mounted,
  action,
}: {
  iconClass: string;
  statusClass: string;
  icon: typeof DropletIcon;
  title: string;
  note: string | null;
  care: CareState;
  mounted: boolean;
  action: {
    label: string;
    pendingLabel: string;
    doneLabel: string;
    bg: string;
    pending: boolean;
    done: boolean;
    onClick: () => void;
  };
}) {
  const last = mounted ? agoLabel(care.lastDoneAt) : null;
  const due = mounted ? dueLabel(care.dueAt) : null;

  return (
    <section className="py-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
          <HugeiconsIcon
            icon={icon}
            size={18}
            strokeWidth={1.9}
            className={`shrink-0 ${iconClass}`}
            aria-hidden
          />
          {title}
        </h2>
        {care.status ? (
          <span className={`text-xs font-medium ${statusClass}`}>
            {STATUS_LABEL[care.status]}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-base leading-relaxed text-ink">
        {note ?? "No guidance for this plant yet."}
      </p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
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

        <CareActionButton icon={icon} {...action} />
      </div>
    </section>
  );
}

/**
 * The pill action that records a care event (Mark watered / Mark fed). Pulled
 * out of CareCard so the same control can be reused elsewhere, e.g. a
 * "water all" action per room in the home listing. Sits at h-10 with a leading
 * icon; swaps to a pending then green-check done label after a tap.
 *
 * Width is pinned by an invisible sizer rendering the (widest) default label,
 * with the live states stacked over it, so the pill never resizes between
 * states regardless of which labels it's given.
 */
function CareActionButton({
  icon,
  label,
  pendingLabel,
  doneLabel,
  bg,
  pending,
  done,
  onClick,
}: {
  icon: typeof DropletIcon;
  label: string;
  pendingLabel: string;
  doneLabel: string;
  bg: string;
  pending: boolean;
  done: boolean;
  onClick: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={pending || done}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className={`relative inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-canvas transition-colors duration-500 disabled:opacity-90 ${
        done ? "bg-healthy" : bg
      }`}
    >
      {/* Invisible sizer: reserves the width of the widest (default) state. */}
      <span className="invisible flex items-center gap-1.5" aria-hidden>
        <HugeiconsIcon icon={icon} size={16} strokeWidth={2} />
        {label}
      </span>

      <span className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {pending ? (
            <motion.span
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {pendingLabel}
            </motion.span>
          ) : done ? (
            <motion.span
              key="done"
              className="flex items-center gap-1.5"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.svg
                width="18"
                height="18"
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
              {doneLabel}
            </motion.span>
          ) : (
            <motion.span
              key="label"
              className="flex items-center gap-1.5"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <HugeiconsIcon icon={icon} size={16} strokeWidth={2} />
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
