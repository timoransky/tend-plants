"use client";

import {
  Cancel01Icon,
  HouseHeartIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  return h.name ?? `House ·${h.token.slice(-4)}`;
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
      // Creating a household does NOT adopt it as your default — that's an
      // explicit choice via "Set default". We just open the new home.
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
        <span className="max-w-[9rem] truncate">
          {labelFor({ token, name })}
        </span>
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
              initial={
                reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }
              }
              transition={{ duration: 0.16, ease: [0.2, 0.7, 0.3, 1] }}
              className="absolute left-0 top-full z-50 mt-2 flex w-64 origin-top-left flex-col gap-1 rounded-2xl bg-surface p-1.5 text-ink shadow-xl shadow-scrim/50"
            >
              {entries.map((h) => {
                const isCurrent = h.token === token;
                const isDefault = primary === h.token;
                return (
                  <div
                    key={h.token}
                    className={`group flex items-center gap-0.5 rounded-xl pl-1 pr-1 ${
                      isCurrent ? "bg-ink/5" : "hover:bg-ink/5"
                    }`}
                  >
                    {isDefault ? (
                      <span
                        title="Your default home"
                        aria-label="Your default home"
                        className="flex size-6 shrink-0 items-center justify-center text-healthy"
                      >
                        <HugeiconsIcon
                          icon={HouseHeartIcon}
                          size={16}
                          strokeWidth={2}
                          aria-hidden
                        />
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label="Set as default home"
                        title="Set as default home"
                        onClick={() => setPrimary(h.token)}
                        className="flex size-6 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink"
                      >
                        <HugeiconsIcon
                          icon={HouseHeartIcon}
                          size={16}
                          strokeWidth={1.7}
                          aria-hidden
                        />
                      </button>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go(h.token)}
                      className="flex min-w-0 flex-1 items-center py-1.5 pr-2 text-left"
                    >
                      <span
                        className={`min-w-0 truncate text-sm text-ink ${
                          isCurrent ? "font-medium" : ""
                        }`}
                      >
                        {labelFor(h)}
                      </span>
                    </button>

                    {isCurrent ? null : (
                      <button
                        type="button"
                        aria-label={`Forget ${labelFor(h)}`}
                        onClick={() => removeVisited(h.token)}
                        className="flex size-6 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink"
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          size={16}
                          strokeWidth={2}
                          aria-hidden
                        />
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
                className="flex w-full items-center rounded-xl px-1 gap-0.5 text-left text-sm font-medium text-healthy-ink transition-colors hover:bg-healthy/10 disabled:opacity-60"
              >
                <span className="flex size-6 px-0.5 shrink-0 items-center justify-center">
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
                <span className="py-2 pr-2">
                  {creating ? "Creating…" : "Create new house"}
                </span>
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
