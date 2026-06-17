"use client";

import { Drawer } from "vaul";

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
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
      snapPoints={[0.6, 0.96]}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[96dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-surface outline-none">

          {plant ? (
            <>
              <div
                aria-hidden
                className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-cream-soft/30"
              />
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1">
                <header className="flex flex-col items-center gap-3 pb-5 text-center">
                  <span className="flex size-24 items-center justify-center rounded-full bg-surface text-5xl shadow-sm">
                    <span aria-hidden>{plant.avatar ?? "🪴"}</span>
                  </span>
                  <div>
                    <Drawer.Title className="text-2xl font-semibold tracking-tight text-cream">
                      {plant.name}
                    </Drawer.Title>
                    <Drawer.Description className="text-sm text-cream-soft">
                      {[plant.room, plant.commonName].filter(Boolean).join(" · ") ||
                        "Houseplant"}
                    </Drawer.Description>
                  </div>
                </header>

                <PlantDetail token={token} initial={toDetailData(plant)} />
              </div>
            </>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
