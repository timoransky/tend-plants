import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { plants } from "@/db/schema";
import { findHousehold } from "@/lib/api";
import { notFound } from "next/navigation";

// Placeholder — the full care sheet + Mark watered/fed actions land in step 4.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string; id: string }> };

export default async function PlantDetailPage({ params }: Props) {
  const { token, id } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  const [plant] = await db
    .select()
    .from(plants)
    .where(and(eq(plants.id, id), eq(plants.householdId, household.id)))
    .limit(1);
  if (!plant) notFound();

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl" aria-hidden>
        {plant.avatar ?? "🪴"}
      </span>
      <h1 className="text-xl font-semibold text-cream">{plant.name}</h1>
      {plant.room ? (
        <p className="text-sm text-cream-soft">{plant.room}</p>
      ) : null}
      <p className="max-w-xs text-sm text-cream-soft">
        The care sheet with Mark watered / Mark fed arrives in the next build
        step.
      </p>
      <Link
        href={`/h/${token}`}
        className="rounded-full bg-canvas-soft px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-canvas-soft/70"
      >
        ← Back home
      </Link>
    </main>
  );
}
