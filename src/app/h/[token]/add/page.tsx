import Link from "next/link";
import { notFound } from "next/navigation";

import { AddPlant } from "@/components/AddPlant";
import { findHousehold } from "@/lib/api";
import { isIdentifyEnabled } from "@/lib/identify";
import { listRooms } from "@/lib/rooms";
import { isStorageEnabled } from "@/lib/storage";
import { buttonIcon, neutralButton, tapScale } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function AddPlantPage({ params }: Props) {
  const { token } = await params;
  const household = await findHousehold(token);
  if (!household) notFound();

  const rooms = await listRooms(household.id);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-10">
      <div className="flex items-center gap-3 pt-5">
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
        <h1 className="text-balance text-xl font-semibold tracking-tight text-cream">
          Add a plant
        </h1>
      </div>

      <p className="px-1 pb-4 pt-2 text-pretty text-sm text-cream-soft">
        Pick a houseplant to start from, then tweak anything. Not listed? Add it
        manually.
      </p>

      <AddPlant
        token={token}
        rooms={rooms}
        identifyEnabled={isIdentifyEnabled()}
        photoEnabled={isStorageEnabled()}
      />
    </main>
  );
}
