"use client";

import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";

import { PlantBubble } from "@/components/PlantBubble";
import { PlantDrawer } from "@/components/PlantDrawer";
import type { RoomGroup } from "@/lib/group-rooms";
import type { PlantWithStatus } from "@/lib/plants";
import { scatterFor } from "@/lib/scatter";

/** Plants needing water now — the calm count shown per room. */
function thirstyCount(plants: PlantWithStatus[]): number {
  return plants.filter(
    (p) => p.water.status === "overdue" || p.water.status === "due_today",
  ).length;
}

/**
 * The home "garden": plants scattered as bubbles, clustered by room, with a
 * tap-to-open detail drawer. Bubbles persist while the drawer mounts inside an
 * <AnimatePresence>, so the shared `layoutId` avatar flies between them.
 */
export function PlantGarden({
  groups,
  token,
}: {
  groups: RoomGroup[];
  token: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derive the selected plant from the latest groups (so a router.refresh after
  // "Mark watered" feeds fresh status into the open drawer) instead of holding a
  // stale snapshot.
  const allPlants = useMemo(() => groups.flatMap((g) => g.plants), [groups]);
  const selected = selectedId
    ? (allPlants.find((p) => p.id === selectedId) ?? null)
    : null;

  const showHeaders = groups.length > 1;

  return (
    <>
      <div className="space-y-8 px-2 pb-12 pt-2">
        {groups.map((group, gi) => {
          const thirsty = thirstyCount(group.plants);
          return (
            <section key={group.key} aria-label={group.room ?? "Everywhere else"}>
              {showHeaders ? (
                <div className="flex items-baseline gap-2 px-2 pb-2">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-cream-soft">
                    {group.room ?? "Everywhere else"}
                  </h2>
                  {thirsty > 0 ? (
                    <span className="rounded-full bg-water/15 px-2 py-0.5 text-[0.7rem] font-medium text-water">
                      {thirsty} thirsty
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-7">
                {group.plants.map((plant, pi) => (
                  <PlantBubble
                    key={plant.id}
                    plant={plant}
                    scatter={scatterFor(plant.id)}
                    delayMs={Math.min(gi * 80 + pi * 35, 600)}
                    onSelect={(p) => setSelectedId(p.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {selected ? (
          <PlantDrawer
            key={selected.id}
            plant={selected}
            token={token}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
