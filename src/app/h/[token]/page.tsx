import Link from "next/link";
import { notFound } from "next/navigation";

import { BottomSheet } from "@/components/BottomSheet";
import { Logo } from "@/components/Logo";
import { PlantCard } from "@/components/PlantCard";
import { ShareButton } from "@/components/ShareButton";
import { findHousehold } from "@/lib/api";
import { listPlantsWithStatus } from "@/lib/plants";
import { buildTasks } from "@/lib/tasks";

// Live tracker — always read fresh from the DB, never cache.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function HomePage({ params }: Props) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  const plants = await listPlantsWithStatus(household.id);
  const tasks = buildTasks(plants);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex flex-col gap-0.5">
          <Logo />
          {household.name ? (
            <span className="pl-7 text-xs text-cream-soft">
              {household.name}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ShareButton />
          <Link
            href={`/h/${token}/add`}
            aria-label="Add a plant"
            className="flex size-9 items-center justify-center rounded-full bg-healthy text-canvas transition-colors hover:bg-healthy/90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {plants.length === 0 ? (
          <EmptyState token={token} />
        ) : (
          <div className="grid grid-cols-3 gap-2 pt-2 sm:grid-cols-4">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} token={token} />
            ))}
          </div>
        )}
      </main>

      <div className="flex max-h-[46vh] min-h-[8rem] flex-col px-2 pb-2">
        <BottomSheet tasks={tasks} />
      </div>
    </div>
  );
}

function EmptyState({ token }: { token: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden>
        🪴
      </span>
      <p className="max-w-xs text-cream-soft">
        No plants yet. Add your first one to start tracking watering and
        feeding.
      </p>
      <Link
        href={`/h/${token}/add`}
        className="rounded-full bg-healthy px-5 py-2.5 text-sm font-semibold text-canvas transition-colors hover:bg-healthy/90"
      >
        Add a plant
      </Link>
    </div>
  );
}
