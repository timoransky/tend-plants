import Link from "next/link";
import { notFound } from "next/navigation";

import { PlantDetail, type PlantDetailData } from "@/components/PlantDetail";
import { PlantPhotoAvatar } from "@/components/PlantPhotoAvatar";
import { StatusDot } from "@/components/StatusDot";
import { findHousehold } from "@/lib/api";
import { getPlantWithStatus } from "@/lib/plants";
import { buttonIcon, neutralButton, tapScale } from "@/lib/ui";

// Live tracker — always read fresh from the DB, never cache.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string; id: string }> };

export default async function PlantDetailPage({ params }: Props) {
  const { token, id } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  const plant = await getPlantWithStatus(household.id, id);
  if (!plant) notFound();

  const data: PlantDetailData = {
    id: plant.id,
    name: plant.name,
    room: plant.room,
    avatar: plant.avatar,
    commonName: plant.commonName,
    notes: plant.notes,
    waterNote: plant.waterNote,
    lightNote: plant.lightNote,
    feedNote: plant.feedNote,
    water: plant.water,
    feed: plant.feed,
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-10">
      <div className="flex items-center justify-between pt-5">
        <Link
          href={`/h/${token}`}
          aria-label="Back to plants"
          className={`${buttonIcon} ${neutralButton} text-cream ${tapScale}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <header className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="relative">
          <PlantPhotoAvatar
            avatar={plant.avatar}
            imageUrl={plant.avatarUrl}
            alt={plant.name}
            className="flex size-24 items-center justify-center rounded-full bg-surface text-5xl shadow-sm"
          />
          <StatusDot
            water={plant.water}
            feed={plant.feed}
            className="absolute bottom-1 right-1 size-5"
          />
        </span>
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-cream">
            {plant.name}
          </h1>
          <p className="text-pretty text-sm text-cream-soft">
            {[plant.room, plant.commonName].filter(Boolean).join(" · ") ||
              "Houseplant"}
          </p>
        </div>
      </header>

      {/* The detail body is styled for the cream care sheet (ink on surface),
          so give it the same surface here as the drawer does. */}
      <div className="rounded-4xl bg-surface p-5">
        <PlantDetail token={token} initial={data} />
      </div>
    </main>
  );
}
