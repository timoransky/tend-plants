"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Landing control: create a brand-new household (POST /api/household) and go to
 * its secret URL, or open an existing household by pasting its link/token.
 */
export function CreateHousehold() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/household", { method: "POST" });
      if (!res.ok) throw new Error();
      const { household } = await res.json();
      router.push(`/h/${household.id}`);
    } catch {
      setError("Couldn't create a household. Please try again.");
      setCreating(false);
    }
  }

  function open() {
    // Accept either a full URL (…/h/<token>) or a bare token.
    const match = link.trim().match(/\/h\/([^/?#\s]+)/);
    const token = match ? match[1] : link.trim();
    if (token) router.push(`/h/${token}`);
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <button
        type="button"
        onClick={create}
        disabled={creating}
        className="h-12 rounded-full bg-healthy px-6 text-base font-semibold text-canvas transition-colors hover:bg-healthy/90 disabled:opacity-60"
      >
        {creating ? "Creating…" : "Create a household"}
      </button>

      {error ? <p className="text-sm text-water">{error}</p> : null}

      <div className="flex items-center gap-3 text-xs text-cream-soft">
        <span className="h-px flex-1 bg-cream-soft/25" />
        or open an existing one
        <span className="h-px flex-1 bg-cream-soft/25" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          open();
        }}
        className="flex gap-2"
      >
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste your household link"
          className="min-w-0 flex-1 rounded-xl bg-canvas-soft px-3 py-2.5 text-sm text-cream placeholder:text-cream-soft outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
        />
        <button
          type="submit"
          className="rounded-xl bg-canvas-soft px-4 text-sm font-medium text-cream transition-colors hover:bg-canvas-soft/70"
        >
          Open
        </button>
      </form>
    </div>
  );
}
