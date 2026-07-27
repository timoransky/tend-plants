import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

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
import { buttonIcon, buttonSm, tapScale } from "@/lib/ui";

// Live tracker — always read fresh from the DB, never cache.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function HomePage({ params }: Props) {
  const { token } = await params;

  // A household's id *is* its token, so the plant query needs nothing from the
  // household lookup — start it now and let the two share one round trip rather
  // than paying for two.
  const plantsPromise = listPlantsWithStatus(token);

  const household = await findHousehold(token);
  if (!household) {
    // Nothing will consume the in-flight query; mark it handled so a failure
    // can't surface as an unhandled rejection.
    void plantsPromise.catch(() => {});
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <Logo wordmark={false} />
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
            className={`${buttonIcon} bg-healthy text-canvas ${tapScale} hover:bg-healthy/90`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
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
        {/* Everything above this point is the static shell: it paints while the
            DB is still answering, which is most of the wait on a cold Neon. Only
            the grid streams in. The notFound() above stays outside the boundary
            on purpose — once a fallback renders, the response has committed to
            200 and the real 404 is no longer available. */}
        <Suspense fallback={<GardenLoading />}>
          {plantsPromise.then((plants) =>
            plants.length === 0 ? (
              <EmptyState token={token} />
            ) : (
              <PlantGarden
                groups={groupByRoom(plants)}
                token={token}
                photoEnabled={isStorageEnabled()}
              />
            ),
          )}
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Shown while the plants stream in. Deliberately *not* a skeleton grid: we don't
 * know yet how many plants there are or which rooms they're in, so any mock grid
 * would predict the wrong shape and lurch when the real one replaced it. A calm,
 * honest "still loading" line makes no promises about the layout — and it's the
 * same affordance the entry screen uses, so the wait reads as one continuous
 * moment rather than two different loading states.
 */
function GardenLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <p className="animate-pulse text-sm text-cream-soft">
        Getting things ready…
      </p>
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
        className={`${buttonSm} bg-healthy text-canvas ${tapScale} hover:bg-healthy/90`}
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
