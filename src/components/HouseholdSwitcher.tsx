"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getPrimary,
  getPrimaryServerSnapshot,
  getVisited,
  getVisitedServerSnapshot,
  recordVisit,
  removeVisited,
  setPrimary,
  subscribe,
  type VisitedHousehold,
} from "@/lib/household-storage";

/** Label for a household other than the current one. */
function otherLabel(h: VisitedHousehold): string {
  return h.name ?? `Household ·${h.token.slice(-4)}`;
}

/**
 * Header control that records the visited household and lets you switch between
 * the households this browser has opened. Visiting a shared link never changes
 * your default home — "Set as default" is the only way that happens.
 */
export function HouseholdSwitcher({
  token,
  name,
}: {
  token: string;
  name: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Local memory, read hydration-safely; updates when we (or another tab) write.
  const primary = useSyncExternalStore(
    subscribe,
    getPrimary,
    getPrimaryServerSnapshot,
  );
  const visited = useSyncExternalStore(
    subscribe,
    getVisited,
    getVisitedServerSnapshot,
  );

  // Remember this visit (write-only side effect — no setState here).
  useEffect(() => {
    recordVisit(token, name);
  }, [token, name]);

  function go(t: string) {
    setOpen(false);
    if (t !== token) router.push(`/h/${t}`);
  }

  async function createNew() {
    setCreating(true);
    try {
      const res = await fetch("/api/household", { method: "POST" });
      if (!res.ok) throw new Error();
      const { household } = await res.json();
      setPrimary(household.id);
      router.push(`/h/${household.id}`);
    } catch {
      setCreating(false);
    }
  }

  const currentLabel = name ?? "My plants";
  const isDefault = primary === token;
  const others = visited.filter((h) => h.token !== token);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-cream-soft transition-colors hover:bg-canvas-soft hover:text-cream"
      >
        <span className="max-w-[9rem] truncate">{currentLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              role="menu"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.2, 0.7, 0.3, 1] }}
              className="absolute left-0 top-full z-50 mt-2 w-64 origin-top-left rounded-2xl bg-surface p-1.5 text-ink shadow-xl shadow-black/30"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-medium text-ink">
                  {currentLabel}
                </span>
                {isDefault ? (
                  <span className="shrink-0 rounded-full bg-healthy/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-healthy">
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPrimary(token)}
                    className="shrink-0 rounded-full bg-healthy/15 px-2 py-0.5 text-[0.7rem] font-medium text-healthy transition-colors hover:bg-healthy/25"
                  >
                    Set as default
                  </button>
                )}
              </div>

              {others.length ? <div className="my-1 h-px bg-ink/10" /> : null}

              {others.map((h) => (
                <div
                  key={h.token}
                  className="group flex items-center rounded-xl pr-1 hover:bg-ink/5"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go(h.token)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                  >
                    <span className="min-w-0 truncate text-sm text-ink">
                      {otherLabel(h)}
                    </span>
                    {primary === h.token ? (
                      <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-healthy">
                        default
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label={`Forget ${otherLabel(h)}`}
                    onClick={() => removeVisited(h.token)}
                    className="shrink-0 rounded-lg p-1 text-ink-soft opacity-0 transition-opacity hover:bg-ink/10 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}

              <div className="my-1 h-px bg-ink/10" />
              <button
                type="button"
                role="menuitem"
                onClick={createNew}
                disabled={creating}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-healthy transition-colors hover:bg-healthy/10 disabled:opacity-60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {creating ? "Creating…" : "Create new household"}
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
