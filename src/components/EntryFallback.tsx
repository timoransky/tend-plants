"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/Logo";
import { getPrimary, recordVisit, setPrimary } from "@/lib/household-storage";
import { buttonSm, tapScale } from "@/lib/ui";

/**
 * The part of `/` that genuinely needs JavaScript: creating a household on a
 * first-ever visit.
 *
 * A returning visitor never gets this far — the inline script on `/` has already
 * redirected them from localStorage during HTML parsing, long before this
 * hydrates. The `getPrimary()` check below is a fallback for the rare case where
 * that script didn't run (blocked inline scripts, a strict CSP).
 */
export function EntryFallback() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Guard against React StrictMode's double-invoke so we never POST twice.
    if (started.current) return;
    started.current = true;
    void enter();

    async function enter() {
      setError(false);
      const existing = getPrimary();
      if (existing) {
        router.replace(`/h/${existing}`);
        return;
      }
      try {
        const res = await fetch("/api/household", { method: "POST" });
        if (!res.ok) throw new Error();
        const { household } = await res.json();
        setPrimary(household.id);
        recordVisit(
          household.id,
          household.name ?? null,
          household.displayCode ?? null,
          household.avatar ?? null,
        );
        router.replace(`/h/${household.id}`);
      } catch {
        started.current = false;
        setError(true);
      }
    }
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Logo className="scale-125" />
      {error ? (
        <>
          <p className="max-w-xs text-sm text-cream-soft">
            Couldn&apos;t open your household. Check your connection and try
            again.
          </p>
          <button
            type="button"
            onClick={() => {
              started.current = false;
              location.reload();
            }}
            className={`${buttonSm} bg-healthy text-canvas ${tapScale} hover:bg-healthy/90`}
          >
            Try again
          </button>
        </>
      ) : (
        <p className="animate-pulse text-sm text-cream-soft">
          Getting things ready…
        </p>
      )}
    </main>
  );
}
