"use client";

import { DropletIcon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

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

/**
 * The care detail for one plant, split by intent: the status rows up top answer
 * "does it need anything, and when?" with the mark action inline; the care
 * guide below carries the static species guidance (water + light), then the
 * personal notes. (Feed is hidden behind SHOW_FEED.)
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
      <CareStatusRow
        verb="Water"
        pastVerb="watered"
        needLabel="Needs water"
        urgentClass="text-water-ink"
        icon={DropletIcon}
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
        <CareStatusRow
          verb="Feed"
          pastVerb="fed"
          needLabel="Needs feed"
          urgentClass="text-feed-ink"
          icon={DropletIcon}
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Care guide
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          <GuideRow icon={DropletIcon} iconClass="text-water-icon">
            {data.waterNote ?? (
              <span className="text-ink-soft">
                No watering guidance for this plant yet.
              </span>
            )}
          </GuideRow>
          <GuideRow icon={Sun03Icon} iconClass="text-light-icon">
            {data.lightNote ?? (
              <span className="text-ink-soft">
                No light guidance for this plant yet.
              </span>
            )}
          </GuideRow>
          {SHOW_FEED ? (
            <GuideRow icon={DropletIcon} iconClass="text-feed-icon">
              {data.feedNote ?? (
                <span className="text-ink-soft">
                  No feeding guidance for this plant yet.
                </span>
              )}
            </GuideRow>
          ) : null}
        </ul>
      </section>

      <section className="py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Notes
        </h2>
        <p className="mt-2 text-pretty text-base leading-relaxed text-ink">
          {data.notes ?? (
            <span className="text-ink-soft">No personal notes yet.</span>
          )}
        </p>
      </section>
    </div>
  );
}

/** One line of the care guide: a color-coded icon anchoring the species'
 * guidance sentence. */
function GuideRow({
  icon,
  iconClass,
  children,
}: {
  icon: typeof DropletIcon;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <HugeiconsIcon
        icon={icon}
        size={18}
        strokeWidth={1.9}
        className={`mt-1 shrink-0 ${iconClass}`}
        aria-hidden
      />
      <p className="text-pretty text-base leading-relaxed text-ink">
        {children}
      </p>
    </li>
  );
}

/** The status headline, e.g. "Needs water", "Water today", "Water in 3 days".
 * The "in N days" form is time-relative, so it's only computed after mount;
 * before that the bare verb renders (matching the SSR output). */
function statusHeadline(
  verb: string,
  needLabel: string,
  care: CareState,
  mounted: boolean,
): string {
  if (care.status === "overdue") return needLabel;
  if (care.status === "due_today") return `${verb} today`;
  if (care.status == null || !mounted || !care.dueAt) return verb;
  const days = Math.ceil((Date.parse(care.dueAt) - Date.now()) / DAY_MS);
  if (days <= 0) return `${verb} today`;
  if (days === 1) return `${verb} tomorrow`;
  return `${verb} in ${days} days`;
}

/**
 * The actionable half of the care sheet for one care kind: a status headline
 * ("Needs water" / "Water in 3 days") over a "Watered 6 days ago · every
 * 7 days" meta line, with the mark action sitting inline on the right. The
 * headline takes the kind's ink color while care is due, and plain ink once
 * the plant is fine — so marking it watered visibly settles the row.
 */
function CareStatusRow({
  verb,
  pastVerb,
  needLabel,
  urgentClass,
  icon,
  care,
  mounted,
  action,
}: {
  verb: string;
  pastVerb: string;
  needLabel: string;
  urgentClass: string;
  icon: typeof DropletIcon;
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
  const urgent = care.status === "overdue" || care.status === "due_today";
  const headline = statusHeadline(verb, needLabel, care, mounted);
  const last = mounted ? agoLabel(care.lastDoneAt) : null;

  const meta: string[] = [];
  if (care.lastDoneAt) {
    meta.push(`${capitalize(pastVerb)} ${last ?? "—"}`);
  } else if (care.intervalDays) {
    meta.push(`Never ${pastVerb}`);
  }
  if (care.intervalDays) {
    meta.push(`every ~${care.intervalDays} days`);
  } else {
    meta.push(meta.length ? "no schedule set" : "No schedule set");
  }

  return (
    <section className="flex items-center justify-between gap-4 py-5">
      <div className="min-w-0">
        <h2
          className={`text-lg font-semibold tracking-tight ${
            urgent
              ? urgentClass
              : care.status == null
                ? "text-ink-soft"
                : "text-ink"
          }`}
        >
          {headline}
        </h2>
        <p className="mt-0.5 text-pretty text-sm tabular-nums text-ink-soft">
          {meta.join(" · ")}
        </p>
      </div>

      <CareActionButton icon={icon} {...action} />
    </section>
  );
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The pill action that records a care event (Mark watered / Mark fed). A
 * self-contained control for the cream care sheet, sitting at h-10 with a
 * leading icon; swaps to a pending then green-check done label after a tap.
 * (The home room-header "select all" is a separate control, RoomSelectButton —
 * this one is built for the solid-blue cream surface and isn't reused there.)
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
      whileTap={reduce ? undefined : { scale: 0.96 }}
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
