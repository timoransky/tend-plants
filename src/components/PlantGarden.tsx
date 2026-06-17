"use client";

import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";

import { PlantBubble } from "@/components/PlantBubble";
import { PlantDrawer } from "@/components/PlantDrawer";
import { clusterLayout } from "@/lib/cluster";
import type { RoomGroup } from "@/lib/group-rooms";
import type { PlantWithStatus } from "@/lib/plants";
import { scatterFor } from "@/lib/scatter";

// Design-space bubble sizes (px); the cluster width maps these to cqw so they
// scale with the container. Plants needing water are one step bigger.
const BASE = 80;
const THIRSTY = 88;

function isThirsty(p: PlantWithStatus): boolean {
  return p.water.status === "overdue" || p.water.status === "due_today";
}

/**
 * The home "garden": plants packed into one organic cluster (rooms as offset
 * sub-clusters) with a tap-to-open detail drawer. Bubbles persist while the
 * drawer mounts inside an <AnimatePresence>, so the shared `layoutId` avatar
 * flies between them. The cluster is sized in container-query units, so the
 * whole blob scales with the viewport without overlap drift.
 */
export function PlantGarden({
  groups,
  token,
}: {
  groups: RoomGroup[];
  token: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Flat list in packing order; derive the open plant from latest groups so a
  // router.refresh after "Mark watered" feeds fresh status into the drawer.
  const allPlants = useMemo(() => groups.flatMap((g) => g.plants), [groups]);
  const layout = useMemo(() => clusterLayout(groups), [groups]);
  const selected = selectedId
    ? (allPlants.find((p) => p.id === selectedId) ?? null)
    : null;

  return (
    <>
      <div
        className="mx-auto w-full py-4"
        style={{ maxWidth: layout.width, containerType: "inline-size" }}
      >
        <div
          className="relative w-full"
          style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        >
          {allPlants.map((plant, i) => {
            const pos = layout.pos.get(plant.id);
            if (!pos) return null;
            const sc = scatterFor(plant.id);
            const sizeCqw = ((isThirsty(plant) ? THIRSTY : BASE) / layout.width) * 100;
            return (
              <div
                key={plant.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 hover:z-20 focus-within:z-20 ${
                  isThirsty(plant) ? "z-10" : ""
                }`}
                style={{
                  left: `${pos.xPct}%`,
                  top: `${pos.yPct}%`,
                  width: `${sizeCqw}cqw`,
                  height: `${sizeCqw}cqw`,
                  fontSize: `${sizeCqw * 0.42}cqw`,
                }}
              >
                <PlantBubble
                  plant={plant}
                  rotate={sc.rotate}
                  breatheDelay={sc.breatheDelay}
                  delayMs={Math.min(i * 30, 500)}
                  onSelect={(p) => setSelectedId(p.id)}
                />
              </div>
            );
          })}
        </div>
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
