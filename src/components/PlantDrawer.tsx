"use client";

import {
  Drawer,
  DrawerDescription,
  DrawerTitle,
} from "@/components/Drawer";
import { PlantDetail, type PlantDetailData } from "@/components/PlantDetail";
import type { PlantWithStatus } from "@/lib/plants";

function toDetailData(p: PlantWithStatus): PlantDetailData {
  return {
    id: p.id,
    name: p.name,
    room: p.room,
    avatar: p.avatar,
    commonName: p.commonName,
    notes: p.notes,
    waterNote: p.waterNote,
    lightNote: p.lightNote,
    feedNote: p.feedNote,
    water: p.water,
    feed: p.feed,
  };
}

/**
 * Plant detail in a bottom-sheet drawer (vaul). vaul handles the drag-to-dismiss,
 * scrim, focus trap, scroll lock and accessibility; we render the plant's care
 * detail (all on one screen) inside. `plant` persists through the close
 * animation while `open` drives visibility.
 */
export function PlantDrawer({
  plant,
  open,
  token,
  onOpenChange,
}: {
  plant: PlantWithStatus | null;
  open: boolean;
  token: string;
  onOpenChange: (open: boolean) => void;
}) {
  // The species' original common name — shown only when the plant was renamed
  // (i.e. its name no longer matches the snapshotted common name).
  const originalName =
    plant?.commonName && plant.commonName !== plant.name
      ? plant.commonName
      : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {plant ? (
        <>
          <header className="flex items-center gap-4 pb-5">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-muted text-4xl">
              <span aria-hidden>{plant.avatar ?? "🪴"}</span>
            </span>
            <div className="min-w-0">
              <DrawerTitle className="truncate text-2xl font-semibold tracking-tight text-ink">
                {plant.name}
              </DrawerTitle>
              <DrawerDescription className="truncate text-sm text-ink-soft">
                {plant.room ?? "Houseplant"}
              </DrawerDescription>
              {originalName ? (
                <p className="truncate text-sm text-ink-soft/70">
                  {originalName}
                </p>
              ) : null}
            </div>
          </header>

          <PlantDetail token={token} initial={toDetailData(plant)} />
        </>
      ) : null}
    </Drawer>
  );
}
