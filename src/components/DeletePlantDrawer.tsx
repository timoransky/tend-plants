"use client";

import { useState } from "react";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";
import type { PlantWithStatus } from "@/lib/plants";

/**
 * Delete confirmation as a nested drawer over the plant-detail sheet — the same
 * "tap a header icon, a sheet slides up" flow as edit. Keeps the destructive
 * commit on its own focused surface rather than buried in a menu or footer.
 * There's no red in the palette, so the weight comes from the explicit question
 * plus a solid ink confirm button (the heaviest neutral), not colour.
 */
export function DeletePlantDrawer({
  plant,
  token,
  open,
  onOpenChange,
  onDeleted,
}: {
  plant: PlantWithStatus;
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/h/${token}/plants/${plant.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onDeleted();
    } catch {
      // Leave the sheet open so the user can retry; a toast arrives in polish.
      setDeleting(false);
    }
  }

  return (
    <Drawer nested open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-3xl">
            <span aria-hidden>{plant.avatar ?? "🪴"}</span>
          </span>
          <div className="min-w-0">
            <DrawerTitle className="text-xl font-semibold tracking-tight text-ink">
              Delete {plant.name}?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-ink-soft">
              This can&apos;t be undone.
            </DrawerDescription>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="h-12 flex-1 rounded-full bg-surface-muted text-base font-semibold text-ink transition-colors hover:bg-surface-muted/70 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="h-12 flex-1 rounded-full bg-ink text-base font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
