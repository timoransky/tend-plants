"use client";

import { Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeletePlantDrawer } from "@/components/DeletePlantDrawer";
import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";
import { EditPlantDrawer } from "@/components/EditPlantDrawer";
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
 * detail inside. The header carries the two "manage this plant" actions as
 * twins: edit and delete, each a header icon that opens its own nested drawer
 * (the edit form / the delete confirmation).
 *
 * A local `view` mirrors the selected `plant` so edits show immediately: saving
 * updates `view` (header + detail) and re-keys <PlantDetail> to reseed its
 * internal state, then refreshes Home so the grid's status dots stay in sync.
 * `plant` persists through the close animation while `open` drives visibility.
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
  const router = useRouter();
  const [view, setView] = useState<PlantWithStatus | null>(plant);
  const [seededId, setSeededId] = useState<string | undefined>(plant?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Bumped on each save so <PlantDetail> remounts and reseeds from the edited
  // values (its internal state is otherwise seeded once on mount).
  const [editVersion, setEditVersion] = useState(0);

  // Re-seed the live view when a different plant is opened. Adjusting state
  // during render (rather than in an effect) is the supported pattern for
  // resetting state when a prop changes, and avoids a cascading re-render.
  if (plant && plant.id !== seededId) {
    setView(plant);
    setSeededId(plant.id);
  }

  // Close the nested sheets whenever the detail sheet itself closes.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setEditOpen(false);
      setDeleteOpen(false);
    }
  }

  // The species' original common name — shown only when the plant was renamed
  // (i.e. its name no longer matches the snapshotted common name).
  const originalName =
    view?.commonName && view.commonName !== view.name ? view.commonName : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {view ? (
        <>
          <header className="flex items-start gap-4 pb-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-muted text-4xl">
                <span aria-hidden>{view.avatar ?? "🪴"}</span>
              </span>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="truncate text-2xl font-semibold tracking-tight text-ink">
                  {view.name}
                </DrawerTitle>
                <DrawerDescription className="truncate text-sm text-ink-soft">
                  {view.room ?? "Houseplant"}
                </DrawerDescription>
                {originalName ? (
                  <p className="truncate text-sm text-ink-soft/70">
                    {originalName}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                aria-label="Edit plant"
                className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-soft transition-colors hover:bg-surface-muted/70 hover:text-ink"
              >
                <HugeiconsIcon
                  icon={PencilEdit02Icon}
                  size={20}
                  strokeWidth={1.9}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete plant"
                className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-soft transition-colors hover:bg-surface-muted/70 hover:text-ink"
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={20}
                  strokeWidth={1.9}
                  aria-hidden
                />
              </button>
            </div>
          </header>

          <PlantDetail
            key={`${view.id}:${editVersion}`}
            token={token}
            initial={toDetailData(view)}
          />

          <EditPlantDrawer
            plant={view}
            token={token}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={(updated) => {
              setView(updated);
              setEditVersion((v) => v + 1);
              // Keep Home's grid (status dots, names) in sync with the edit.
              router.refresh();
            }}
          />

          <DeletePlantDrawer
            plant={view}
            token={token}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => {
              setDeleteOpen(false);
              onOpenChange(false);
              // Drop the deleted plant from Home.
              router.refresh();
            }}
          />
        </>
      ) : null}
    </Drawer>
  );
}
