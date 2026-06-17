"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { PlantBubble } from "@/components/PlantBubble";
import { PlantDrawer } from "@/components/PlantDrawer";
import type { RoomGroup } from "@/lib/group-rooms";
import type { PlantWithStatus } from "@/lib/plants";

/** Plants needing water now — the calm count shown on each room header. */
function thirstyCount(plants: PlantWithStatus[]): number {
  return plants.filter(
    (p) => p.water.status === "overdue" || p.water.status === "due_today",
  ).length;
}

/**
 * The home screen: each room is a collapsible accordion section holding a grid
 * of plant avatars, with a tap-to-open detail drawer. Bubbles persist while the
 * drawer mounts inside an <AnimatePresence>, so the shared `layoutId` avatar
 * flies between them.
 */
export function PlantGarden({
  groups,
  token,
}: {
  groups: RoomGroup[];
  token: string;
}) {
  const reduce = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Derive the open plant from the latest groups so a router.refresh after
  // "Mark watered" feeds fresh status into the drawer.
  const allPlants = useMemo(() => groups.flatMap((g) => g.plants), [groups]);
  const selected = selectedId
    ? (allPlants.find((p) => p.id === selectedId) ?? null)
    : null;

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1 pt-1">
        {groups.map((group) => {
          const isOpen = !collapsed.has(group.key);
          const thirsty = thirstyCount(group.plants);
          const label = group.room ?? "Everywhere else";
          const panelId = `room-panel-${group.key}`;
          return (
            <section key={group.key}>
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-canvas-soft focus-visible:bg-canvas-soft"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className={`shrink-0 text-cream-soft transition-transform ${
                    isOpen ? "" : "-rotate-90"
                  }`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-medium text-cream">{label}</span>
                <span className="text-xs text-cream-soft">
                  {group.plants.length}
                </span>
                {thirsty > 0 ? (
                  <span className="ml-auto rounded-full bg-water/15 px-2 py-0.5 text-[0.7rem] font-medium text-water">
                    {thirsty} thirsty
                  </span>
                ) : null}
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    id={panelId}
                    key="panel"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }
                    }
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-2 px-1 pb-3 pt-2 sm:grid-cols-4">
                      {group.plants.map((plant, i) => (
                        <PlantBubble
                          key={plant.id}
                          plant={plant}
                          delayMs={Math.min(i, 12) * 35}
                          onSelect={(p) => setSelectedId(p.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
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
