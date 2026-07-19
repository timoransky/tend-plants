"use client";

import { useEffect, useState } from "react";

import { Drawer } from "@/components/Drawer";
import { PlantForm, type PlantFormValues } from "@/components/PlantForm";
import type { PlantWithStatus } from "@/lib/plants";
import type { SpeciesDetail } from "@/lib/species";

function valuesFromPlant(p: PlantWithStatus): PlantFormValues {
  return {
    name: p.name,
    room: p.room ?? "",
    avatar: p.avatar ?? "",
    avatarImageKey: p.avatarImageKey,
    avatarImageUrl: p.avatarUrl,
    waterIntervalDays:
      p.waterIntervalDays != null ? String(p.waterIntervalDays) : "",
    waterNote: p.waterNote ?? "",
    lightNote: p.lightNote ?? "",
    feedIntervalDays:
      p.feedIntervalDays != null ? String(p.feedIntervalDays) : "",
    feedNote: p.feedNote ?? "",
    notes: p.notes ?? "",
  };
}

/**
 * The edit sheet: a nested drawer (over the plant-detail sheet) wrapping the
 * shared <PlantForm>, seeded from the plant and PATCHing it on save. If the
 * plant was created from a species, its care defaults are lazy-fetched so the
 * form's "reset to defaults" works. (Delete lives on the detail sheet, not
 * here — this sheet's one job is editing.)
 */
export function EditPlantDrawer({
  plant,
  token,
  photoEnabled,
  open,
  onOpenChange,
  onSaved,
}: {
  plant: PlantWithStatus;
  token: string;
  photoEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: PlantWithStatus) => void;
}) {
  // The loaded species, tagged with the key it belongs to. We derive the
  // effective `species` during render so it's null whenever it doesn't match
  // the current plant — no synchronous reset in the effect needed.
  const [loaded, setLoaded] = useState<{
    key: string;
    detail: SpeciesDetail;
  } | null>(null);

  // Lazy-load the species this plant came from, to power "reset to defaults".
  // Refetched when the sheet opens or the plant changes; failures leave it
  // unloaded (no reset button), exactly like a manually-added plant.
  useEffect(() => {
    const key = plant.speciesKey;
    if (!open || !key) return;
    let active = true;
    fetch(`/api/species/${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.species) {
          setLoaded({ key, detail: d.species as SpeciesDetail });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, plant.speciesKey]);

  const species =
    loaded && loaded.key === plant.speciesKey ? loaded.detail : null;

  async function save(values: PlantFormValues) {
    const res = await fetch(`/api/h/${token}/plants/${plant.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        room: values.room.trim() || null,
        avatar: values.avatar,
        avatarImageKey: values.avatarImageKey,
        waterIntervalDays: Number(values.waterIntervalDays) || null,
        waterNote: values.waterNote.trim() || null,
        lightNote: values.lightNote.trim() || null,
        feedIntervalDays: Number(values.feedIntervalDays) || null,
        feedNote: values.feedNote.trim() || null,
        notes: values.notes.trim() || null,
      }),
    });
    if (!res.ok) throw new Error();
    const { plant: updated } = (await res.json()) as {
      plant: PlantWithStatus;
    };
    onSaved(updated);
    onOpenChange(false);
  }

  return (
    <Drawer nested open={open} onOpenChange={onOpenChange}>
      <PlantForm
        key={plant.id}
        initial={valuesFromPlant(plant)}
        species={species}
        token={token}
        photoEnabled={photoEnabled}
        title="Edit plant"
        subtitle="Update name, room, care and notes"
        submitLabel="Save changes"
        submittingLabel="Saving…"
        onSubmit={save}
      />
    </Drawer>
  );
}
