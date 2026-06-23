"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/Logo";
import { getPrimary, recordVisit, setPrimary } from "@/lib/household-storage";

/**
 * Entry point. No landing screen: reuse this browser's saved household, or
 * auto-create one, then redirect to it. The token is the only credential, so
 * remembering it locally is what keeps a returning visitor on their own plants.
 */
export default function Home() {
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
            Couldn&apos;t open your garden. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              started.current = false;
              location.reload();
            }}
            className="rounded-full bg-healthy px-5 py-2.5 text-sm font-semibold text-canvas transition-colors hover:bg-healthy/90"
          >
            Try again
          </button>
        </>
      ) : (
        <p className="animate-pulse text-sm text-cream-soft">
          Growing your garden…
        </p>
      )}
    </main>
  );
}
