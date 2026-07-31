"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BulkSelectBar, type BulkBarState } from "@/components/BulkSelectBar";
import { PlantBubble } from "@/components/PlantBubble";
import { PlantDrawer } from "@/components/PlantDrawer";
import { RoomSelectButton } from "@/components/RoomSelectButton";
import { WaterDropBadge } from "@/components/WaterDropBadge";
import type { RoomGroup } from "@/lib/group-rooms";
import type { PlantWithStatus } from "@/lib/plants";
import { roomIcon } from "@/lib/room-icon";
import { ChevronDownIcon, ICON_SM } from "@/lib/icons";

/** Plants needing water now — the calm count shown on each room header. */
function thirstyCount(plants: PlantWithStatus[]): number {
  return plants.filter(
    (p) => p.water.status === "overdue" || p.water.status === "due_today",
  ).length;
}

/** An in-flight (or freshly-completed, undoable) batch-water action. */
type Batch = {
  // The room key, or "__selection__" for a multi-select round (slice 5).
  scope: string;
  ids: string[];
  // Prior `lastWatered` (ISO) per id, captured so Undo restores it exactly.
  prev: Map<string, string | null>;
  phase: "pending" | "undoable";
};

const UNDO_MS = 6000;

/**
 * The home screen: each room is a collapsible accordion section holding a grid
 * of plant avatars; tapping one opens its care detail in a bottom-sheet drawer.
 * The selected plant is held in state so it persists through the drawer's close
 * animation.
 *
 * Each room header carries a quiet "Select all" button: idle, it enters
 * multi-select with that whole room preselected; while selecting, it toggles the
 * room in or out of the selection (so a selection can span rooms). Watering is
 * always confirmed in the bottom bar, then offers a ~6s Undo before the change
 * is committed and Home re-sorted. During that window the grid renders from
 * `overrides` (fresh rows keyed by id) laid over the original group order, so
 * badges clear instantly with NO reshuffle. Undo restores the captured prior
 * timestamps (including never-watered → null).
 */
export function PlantGarden({
  groups,
  token,
  photoEnabled,
}: {
  groups: RoomGroup[];
  token: string;
  photoEnabled: boolean;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [drawerPlant, setDrawerPlant] = useState<PlantWithStatus | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Batch-water state, shared by the room pills (slice 4) and multi-select
  // (slice 5). `overrides` holds freshly-watered/restored rows by id; the grid
  // renders `overrides.get(p.id) ?? p` WITHOUT re-sorting, so nothing reshuffles
  // mid-undo. A live timer commits the undoable batch after UNDO_MS.
  const [batch, setBatch] = useState<Batch | null>(null);
  const [overrides, setOverrides] = useState<Map<string, PlantWithStatus>>(
    () => new Map(),
  );
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Multi-select (slice 5): a long-press enters `selecting` mode; taps then
  // toggle plants across rooms. Watering reuses the batch machinery above with
  // the "__selection__" scope. Deselecting the last plant exits the mode.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  function enterSelect(id: string) {
    setSelecting(true);
    setSelected(new Set([id]));
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    if (next.size === 0) setSelecting(false);
  }

  function cancelSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  // Enter select mode from a room header with that whole room preselected. The
  // user then adjusts (tap to toggle) and confirms in the bottom bar — never an
  // accidental one-tap water. Commits any still-undoable batch first.
  function startRoomSelect(group: RoomGroup) {
    if (batch?.phase === "undoable") commit();
    setSelected(new Set(group.plants.map((p) => p.id)));
    setSelecting(true);
  }

  // While selecting: add a whole room to the selection, or (if it's already
  // fully selected) remove it. Deselecting down to nothing exits select mode,
  // matching the per-plant rule in `toggleSelect`.
  function toggleRoomSelect(group: RoomGroup) {
    const ids = group.plants.map((p) => p.id);
    const next = new Set(selected);
    const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
    for (const id of ids) {
      if (allSelected) next.delete(id);
      else next.add(id);
    }
    setSelected(next);
    if (next.size === 0) setSelecting(false);
  }

  // Clear overrides only when the `groups` prop identity changes — i.e. a
  // router.refresh() has landed with fresh server data. Clearing at refresh-call
  // time would flash the stale (pre-water) state for a frame. Same
  // adjust-state-during-render pattern as PlantDrawer's re-seed.
  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    if (overrides.size) setOverrides(new Map());
  }

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectPlant(plant: PlantWithStatus) {
    setDrawerPlant(plant);
    setDrawerOpen(true);
  }

  async function postWater(
    entries: { id: string; lastWatered?: string | null }[],
  ): Promise<PlantWithStatus[]> {
    const res = await fetch(`/api/h/${token}/plants/water`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error();
    const data = (await res.json()) as { plants: PlantWithStatus[] };
    return data.plants;
  }

  function mergeOverrides(updated: PlantWithStatus[]) {
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const p of updated) next.set(p.id, p);
      return next;
    });
  }

  // Finalise the undoable batch: drop the pill and refresh Home so it re-sorts.
  // `overrides` is cleared by the groups-identity guard when the refresh lands.
  function commit() {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setBatch(null);
    router.refresh();
  }

  // Water an explicit set of plants (a whole room, or a multi-select). Commits
  // any still-undoable prior batch first so only one Undo is ever live.
  async function waterPlants(scope: string, plants: PlantWithStatus[]) {
    if (batch?.phase === "undoable") commit();
    const ids = plants.map((p) => p.id);
    const prev = new Map(
      plants.map((p) => [p.id, p.water.lastDoneAt] as const),
    );
    setBatch({ scope, ids, prev, phase: "pending" });
    try {
      const updated = await postWater(ids.map((id) => ({ id })));
      mergeOverrides(updated);
      setBatch({ scope, ids, prev, phase: "undoable" });
      undoTimer.current = setTimeout(commit, UNDO_MS);
    } catch {
      setBatch(null);
    }
  }

  // Restore the batch's captured prior timestamps and refresh immediately.
  async function undo() {
    if (!batch) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    const { ids, prev } = batch;
    setBatch(null);
    try {
      const restored = await postWater(
        ids.map((id) => ({ id, lastWatered: prev.get(id) ?? null })),
      );
      mergeOverrides(restored);
    } finally {
      router.refresh();
    }
  }

  // Lay any fresh (watered/restored) rows over the original group order.
  const displayGroups: RoomGroup[] = overrides.size
    ? groups.map((g) => ({
        ...g,
        plants: g.plants.map((p) => overrides.get(p.id) ?? p),
      }))
    : groups;

  // Water the current multi-selection, then leave select mode (the bar switches
  // to its own pending/undo faces off the "__selection__" batch).
  function waterSelected() {
    const chosen = displayGroups
      .flatMap((g) => g.plants)
      .filter((p) => selected.has(p.id));
    setSelecting(false);
    setSelected(new Set());
    if (chosen.length) waterPlants("__selection__", chosen);
  }

  // The bulk bar is driven by the selection batch when one is live, else by the
  // in-progress selection. Null hides (and animates out) the bar.
  const selectionBatch = batch?.scope === "__selection__" ? batch : null;
  const barState: BulkBarState = selectionBatch
    ? selectionBatch.phase === "pending"
      ? "pending"
      : "undo"
    : selecting
      ? "selecting"
      : null;
  const barCount = selectionBatch ? selectionBatch.ids.length : selected.size;
  const barVisible = barState !== null;

  // Existing room names, for the edit form's room chips (add uses the page's).
  const rooms = groups
    .map((g) => g.room)
    .filter((r): r is string => r !== null);

  function bubbleGrid(plants: PlantWithStatus[]) {
    return (
      <div className="grid grid-cols-3 gap-x-2 gap-y-3 px-1 pb-3 pt-2 sm:grid-cols-6 sm:gap-3">
        {plants.map((plant, i) => (
          <PlantBubble
            key={plant.id}
            plant={plant}
            delayMs={Math.min(i, 12) * 35}
            onSelect={selectPlant}
            selectMode={selecting}
            selected={selected.has(plant.id)}
            onLongPress={selecting ? undefined : () => enterSelect(plant.id)}
            onToggleSelect={() => toggleSelect(plant.id)}
          />
        ))}
      </div>
    );
  }

  // With no rooms at all, the lone "Everywhere else" group has nothing to
  // distinguish it from — so skip the header/accordion and just show the grid.
  const hasRooms = groups.some((group) => group.room !== null);
  if (!hasRooms) {
    return (
      <>
        <div className={`pt-1 ${barVisible ? "pb-24" : ""}`}>
          {bubbleGrid(displayGroups.flatMap((g) => g.plants))}
        </div>
        <PlantDrawer
          plant={drawerPlant}
          open={drawerOpen}
          token={token}
          rooms={rooms}
          photoEnabled={photoEnabled}
          onOpenChange={setDrawerOpen}
        />
        <BulkSelectBar
          count={barCount}
          state={barState}
          onWater={waterSelected}
          onCancel={cancelSelect}
          onUndo={undo}
        />
      </>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-1 pt-1 ${barVisible ? "pb-24" : ""}`}>
        {displayGroups.map((group) => {
          const isOpen = !collapsed.has(group.key);
          const thirsty = thirstyCount(group.plants);
          const label = group.room ?? "Everywhere else";
          const panelId = `room-panel-${group.key}`;
          // Is every plant in this room already in the selection? Drives the
          // Select all ↔ Deselect all toggle while selecting.
          const allSelected =
            group.plants.length > 0 &&
            group.plants.every((p) => selected.has(p.id));
          return (
            <section key={group.key}>
              <div className="flex w-full items-center gap-2 rounded-2xl py-1 pl-3 pr-1.5 transition-colors hover:bg-canvas-soft">
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-cream/25"
                >
                  <HugeiconsIcon
                    icon={ChevronDownIcon}
                    size={ICON_SM}
                    strokeWidth={2}
                    aria-hidden
                    className={`shrink-0 text-cream-soft transition-transform ${
                      isOpen ? "" : "-rotate-90"
                    }`}
                  />
                  <HugeiconsIcon
                    icon={roomIcon(group.room)}
                    size={ICON_SM}
                    strokeWidth={1.9}
                    className="shrink-0 text-cream-soft"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-cream">
                    {label}
                  </span>
                  {thirsty > 0 ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-water/15 pr-1.5 pl-1 py-0.5 text-[0.65rem] font-medium tabular-nums text-water"
                      aria-label={`${thirsty} of ${group.plants.length} need water`}
                    >
                      <WaterDropBadge className="size-2.5 shrink-0" />
                      {thirsty}/{group.plants.length}
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-cream-soft">
                      {group.plants.length}
                    </span>
                  )}
                </button>

                <RoomSelectButton
                  selecting={selecting}
                  allSelected={allSelected}
                  room={label}
                  disabled={batch?.phase === "pending"}
                  onClick={() =>
                    selecting ? toggleRoomSelect(group) : startRoomSelect(group)
                  }
                />
              </div>

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
                    {bubbleGrid(group.plants)}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          );
        })}
      </div>

      <PlantDrawer
        plant={drawerPlant}
        open={drawerOpen}
        token={token}
        rooms={rooms}
        photoEnabled={photoEnabled}
        onOpenChange={setDrawerOpen}
      />

      <BulkSelectBar
        count={barCount}
        state={barState}
        onWater={waterSelected}
        onCancel={cancelSelect}
        onUndo={undo}
      />
    </>
  );
}
