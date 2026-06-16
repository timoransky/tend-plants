import Link from "next/link";

import { StatusDot } from "@/components/StatusDot";
import type { PlantWithStatus } from "@/lib/plants";

/** A circular plant avatar with name, room, and a status dot. Links to the
 * plant detail / care sheet. `index` drives a small staggered entrance. */
export function PlantCard({
  plant,
  token,
  index = 0,
}: {
  plant: PlantWithStatus;
  token: string;
  index?: number;
}) {
  return (
    <Link
      href={`/h/${token}/p/${plant.id}`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      className="rise group flex flex-col items-center gap-2 rounded-3xl p-2 text-center outline-none transition-colors hover:bg-canvas-soft focus-visible:bg-canvas-soft"
    >
      <span className="relative">
        <span className="flex size-20 items-center justify-center rounded-full bg-surface text-3xl shadow-sm transition-transform group-hover:scale-105 group-focus-visible:scale-105">
          <span aria-hidden="true">{plant.avatar ?? "🪴"}</span>
        </span>
        <StatusDot
          water={plant.water}
          feed={plant.feed}
          className="absolute bottom-0.5 right-0.5 size-4"
        />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-cream">{plant.name}</span>
        {plant.room ? (
          <span className="text-xs text-cream-soft">{plant.room}</span>
        ) : null}
      </span>
    </Link>
  );
}
