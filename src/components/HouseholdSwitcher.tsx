"use client";

import { HouseHeartIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { HouseholdDrawer } from "@/components/HouseholdDrawer";
import { AddIcon, ChevronDownIcon, ICON_MD, ICON_SM } from "@/lib/icons";
import {
  getPrimary,
  getPrimaryServerSnapshot,
  getVisited,
  getVisitedServerSnapshot,
  recordVisit,
  removeVisited,
  setPrimary,
  subscribe,
  updateVisited,
  type VisitedHousehold,
} from "@/lib/household-storage";
import { neutralButton, tapScale } from "@/lib/ui";

/**
 * Human label for a household: its user-set name, else its friendly word-pair
 * code, else the legacy token-tail fallback (for records that predate codes).
 */
function labelFor(h: {
  token: string;
  name: string | null;
  code?: string | null;
}): string {
  return h.name ?? h.code ?? `Household ·${h.token.slice(-4)}`;
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
  code,
  avatar,
}: {
  token: string;
  name: string | null;
  code: string | null;
  avatar: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // The household whose "manage" drawer is open (rename / remove), or null.
  const [manageToken, setManageToken] = useState<string | null>(null);

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
    recordVisit(token, name, code, avatar);
  }, [token, name, code, avatar]);

  function go(t: string) {
    setOpen(false);
    if (t !== token) router.push(`/h/${t}`);
  }

  // Open the manage drawer for a household. Close the dropdown first so the two
  // surfaces never overlap.
  function manage(t: string) {
    setOpen(false);
    setManageToken(t);
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
    : [{ token, name, code, avatar, lastVisitedAt: 0 }, ...visited];

  // Render in a stable, selection-independent order (alphabetical by label) so
  // the list never reshuffles just because you switched houses — recordVisit
  // pumps the current home to the front of storage, but the menu ignores that.
  const ordered = [...entries].sort((a, b) =>
    labelFor(a).localeCompare(labelFor(b), undefined, { sensitivity: "base" }),
  );

  // Label the trigger from the (locally updated) entry so an edit to the current
  // household reflects instantly, without waiting for a server refresh.
  const current = entries.find((h) => h.token === token);
  const triggerLabel = labelFor(current ?? { token, name, code });

  // The entry whose manage drawer is open (if any).
  const manageEntry = manageToken
    ? (entries.find((h) => h.token === manageToken) ?? null)
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Current household: ${triggerLabel}. Switch household`}
        className={`flex h-9 items-center gap-1 rounded-full ${neutralButton} px-3 text-cream-soft ${tapScale} hover:text-cream`}
      >
        <span className="max-w-[9rem] truncate text-sm font-semibold text-cream">
          {triggerLabel}
        </span>
        <HugeiconsIcon
          icon={ChevronDownIcon}
          size={ICON_SM}
          strokeWidth={2}
          aria-hidden
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
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
              className="absolute left-0 top-full z-50 mt-2 flex w-64 origin-top-left flex-col gap-1 rounded-2xl bg-surface p-1 text-ink shadow-xl shadow-scrim/50"
            >
              <div className="px-2 pb-0.5 pt-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-soft">
                Your households
              </div>

              {ordered.map((h) => {
                const isCurrent = h.token === token;
                const isDefault = primary === h.token;
                return (
                  <div
                    key={h.token}
                    className={`group flex items-center gap-0.5 rounded-xl pl-1 pr-1 ${
                      isCurrent ? "bg-ink/5" : "hover:bg-ink/5"
                    }`}
                  >
                    <span
                      title={isDefault ? "Your default household" : undefined}
                      className="flex size-7 shrink-0 items-center justify-center text-healthy"
                      aria-hidden
                    >
                      {isDefault ? (
                        <HugeiconsIcon
                          icon={HouseHeartIcon}
                          size={ICON_SM}
                          strokeWidth={2}
                        />
                      ) : null}
                    </span>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go(h.token)}
                      className="flex min-w-0 flex-1 items-center py-2 pr-1 text-left"
                    >
                      <span
                        className={`min-w-0 truncate text-sm text-ink ${
                          isCurrent ? "font-medium" : ""
                        }`}
                      >
                        {labelFor(h)}
                      </span>
                      {isDefault ? (
                        <span className="sr-only"> (default household)</span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      aria-label={`Manage ${labelFor(h)}`}
                      title="Manage"
                      onClick={() => manage(h.token)}
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-soft ${tapScale} hover:bg-ink/10 hover:text-ink`}
                    >
                      <HugeiconsIcon
                        icon={MoreHorizontalIcon}
                        size={ICON_MD}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </button>
                  </div>
                );
              })}

              <div className="mx-1 my-0.5 h-px bg-ink/10" />
              <button
                type="button"
                role="menuitem"
                onClick={createNew}
                disabled={creating}
                className={`flex w-full items-center rounded-xl px-1 gap-0.5 text-left text-sm font-medium text-healthy-ink ${tapScale} hover:bg-healthy/10 disabled:opacity-60`}
              >
                <span className="flex size-7 px-0.5 shrink-0 items-center justify-center">
                  <HugeiconsIcon
                    icon={AddIcon}
                    size={ICON_SM}
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
                <span className="py-2 pr-2">
                  {creating ? "Creating…" : "Create new household"}
                </span>
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <HouseholdDrawer
        entry={manageEntry}
        open={manageToken !== null}
        onOpenChange={(o) => {
          if (!o) setManageToken(null);
        }}
        onSaved={(patch) => {
          if (manageToken) updateVisited(manageToken, patch);
        }}
        onSetDefault={() => {
          if (manageToken) setPrimary(manageToken);
        }}
        onRemoved={() => {
          if (manageToken) removeVisited(manageToken);
          setManageToken(null);
        }}
        canRemove={manageToken !== null && manageToken !== token}
        isDefault={manageToken !== null && primary === manageToken}
      />
    </div>
  );
}
