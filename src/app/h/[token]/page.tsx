import Link from "next/link";
import { notFound } from "next/navigation";

import { FirstRunWelcome } from "@/components/FirstRunWelcome";
import { HouseholdSwitcher } from "@/components/HouseholdSwitcher";
import { Logo } from "@/components/Logo";
import { PlantGarden } from "@/components/PlantGarden";
import { ShareButton } from "@/components/ShareButton";
import { findHousehold } from "@/lib/api";
import { groupByRoom } from "@/lib/group-rooms";
import { listPlantsWithStatus } from "@/lib/plants";
import { seedEnabled } from "@/lib/seed";
import { isStorageEnabled } from "@/lib/storage";
import { tapScale } from "@/lib/ui";

// Live tracker — always read fresh from the DB, never cache.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function HomePage({ params }: Props) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  const plants = await listPlantsWithStatus(household.id);
  const groups = groupByRoom(plants);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <Logo />
          <HouseholdSwitcher
            token={token}
            name={household.name}
            code={household.displayCode}
            avatar={household.avatar}
          />
        </div>
        <div className="flex items-center gap-2">
          <ShareButton token={token} />
          <Link
            href={`/h/${token}/add`}
            aria-label="Add a plant"
            className={`flex size-10 items-center justify-center rounded-full bg-healthy text-canvas ${tapScale} hover:bg-healthy/90`}
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

      <main className="flex flex-1 flex-col px-4 pb-4">
        <FirstRunWelcome />
        {plants.length === 0 ? (
          <EmptyState token={token} />
        ) : (
          <PlantGarden
            groups={groups}
            token={token}
            photoEnabled={isStorageEnabled()}
          />
        )}
      </main>
    </div>
  );
}

function EmptyState({ token }: { token: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden>
        🪴
      </span>
      <p className="max-w-xs text-balance text-cream-soft">
        No plants yet. Add your first one to start tracking watering.
      </p>
      <Link
        href={`/h/${token}/add`}
        className={`rounded-full bg-healthy px-5 py-2.5 text-sm font-semibold text-canvas ${tapScale} hover:bg-healthy/90`}
      >
        Add a plant
      </Link>
      {seedEnabled() ? (
        // Plain <a> (not <Link>) so Next never prefetches — that would seed it.
        <a
          href={`/api/h/${token}/seed?count=10`}
          className="text-xs text-cream-soft underline-offset-2 transition-colors hover:text-cream hover:underline"
        >
          or seed demo plants
        </a>
      ) : null}
    </div>
  );
}
