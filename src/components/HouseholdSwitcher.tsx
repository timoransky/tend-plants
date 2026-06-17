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

/** Human label for a household: its name, else a short code from the token. */
function labelFor(h: { token: string; name: string | null }): string {
  return h.name ?? `Household ·${h.token.slice(-4)}`;
}

/**
 * Header control that records the visited household and lets you switch between
 * the households this browser has opened. Every household — including the one
 * you're on and your default — is a clickable row labelled by its code.
 * Visiting a shared link never changes your default; "Set default" does.
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

  // Always list the current household, even if the visit write hasn't landed.
  const entries: VisitedHousehold[] = visited.some((h) => h.token === token)
    ? visited
    : [{ token, name, lastVisitedAt: 0 }, ...visited];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-cream-soft transition-colors hover:bg-canvas-soft hover:text-cream"
      >
        <span className="max-w-[9rem] truncate">{labelFor({ token, name })}</span>
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
              className="absolute left-0 top-full z-50 mt-2 flex w-72 origin-top-left flex-col gap-1 rounded-2xl bg-surface p-1.5 text-ink shadow-xl shadow-black/30"
            >
              {entries.map((h) => {
                const isCurrent = h.token === token;
                const isDefault = primary === h.token;
                return (
                  <div
                    key={h.token}
                    className={`group flex items-center rounded-xl pr-1 ${
                      isCurrent ? "bg-ink/5" : "hover:bg-ink/5"
                    }`}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go(h.token)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                    >
                      <span
                        aria-hidden
                        className={`size-1.5 shrink-0 rounded-full ${
                          isCurrent ? "bg-healthy" : "bg-transparent"
                        }`}
                      />
                      <span
                        className={`min-w-0 truncate text-sm text-ink ${
                          isCurrent ? "font-medium" : ""
                        }`}
                      >
                        {labelFor(h)}
                      </span>
                    </button>

                    {isDefault ? (
                      <span className="shrink-0 rounded-full bg-healthy/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-healthy">
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPrimary(h.token)}
                        className="shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-medium text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink"
                      >
                        Set default
                      </button>
                    )}

                    {isCurrent ? null : (
                      <button
                        type="button"
                        aria-label={`Forget ${labelFor(h)}`}
                        onClick={() => removeVisited(h.token)}
                        className="shrink-0 rounded-lg p-1 text-ink-soft transition-colors hover:bg-ink/10"
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
                    )}
                  </div>
                );
              })}

              <div className="mx-1 my-0.5 h-px bg-ink/10" />
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
