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
  // The species' original common name — shown only when the plant was renamed
  // (i.e. its name no longer matches the snapshotted common name).
  const originalName =
    plant?.commonName && plant.commonName !== plant.name
      ? plant.commonName
      : null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim/75" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-canvas outline-none">

          {plant ? (
            <>
              <div
                aria-hidden
                className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-cream-soft/30"
              />
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1">
                <header className="flex items-center gap-4 pb-5">
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface text-4xl shadow-sm">
                    <span aria-hidden>{plant.avatar ?? "🪴"}</span>
                  </span>
                  <div className="min-w-0">
                    <Drawer.Title className="truncate text-2xl font-semibold tracking-tight text-cream">
                      {plant.name}
                    </Drawer.Title>
                    <Drawer.Description className="truncate text-sm text-cream-soft">
                      {plant.room ?? "Houseplant"}
                    </Drawer.Description>
                    {originalName ? (
                      <p className="truncate text-sm text-cream-soft/70">
                        {originalName}
                      </p>
                    ) : null}
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
