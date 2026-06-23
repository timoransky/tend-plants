"use client";

import { Delete02Icon, HouseHeartIcon, HouseIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Drawer, DrawerDescription, DrawerTitle } from "@/components/Drawer";
import { tapScale } from "@/lib/ui";

export type ManagedHousehold = {
  token: string;
  name: string | null;
  code?: string | null;
  // The household's chosen emoji. The picker is hidden for now (see
  // HouseholdSwitcher), but the field stays wired through so it's easy to bring
  // back; the drawer doesn't edit it today.
  avatar?: string | null;
};

function labelFor(h: ManagedHousehold): string {
  return h.name ?? h.code ?? `House ·${h.token.slice(-4)}`;
}

/**
 * "Manage home" sheet, opened from the household switcher. Gives renaming room
 * to breathe, hosts "set as default", and tucks the destructive "remove from
 * this device" action behind the drawer so it can't be hit by accident from the
 * menu. Mirrors the ShareButton drawer pattern; the Root stays mounted and is
 * driven by `open`.
 *
 * Renaming PATCHes the household here, then reports the new name up so the
 * switcher can update its local memory instantly. Removing is local-only
 * (forget the link on this browser) and is hidden for the household you're
 * currently viewing — you can't forget where you are.
 */
export function HouseholdDrawer({
  entry,
  open,
  onOpenChange,
  onSaved,
  onSetDefault,
  onRemoved,
  canRemove,
  isDefault,
}: {
  entry: ManagedHousehold | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (patch: { name: string | null }) => void;
  onSetDefault: () => void;
  onRemoved: () => void;
  canRemove: boolean;
  isDefault: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {entry ? (
        <ManageBody
          key={entry.token}
          entry={entry}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onSetDefault={onSetDefault}
          onRemoved={onRemoved}
          canRemove={canRemove}
          isDefault={isDefault}
        />
      ) : null}
    </Drawer>
  );
}

/** Keyed by token so the draft resets cleanly when a different home is managed
 * — no synchronous state reset in an effect. */
function ManageBody({
  entry,
  onOpenChange,
  onSaved,
  onSetDefault,
  onRemoved,
  canRemove,
  isDefault,
}: {
  entry: ManagedHousehold;
  onOpenChange: (open: boolean) => void;
  onSaved: (patch: { name: string | null }) => void;
  onSetDefault: () => void;
  onRemoved: () => void;
  canRemove: boolean;
  isDefault: boolean;
}) {
  const [draftName, setDraftName] = useState(entry.name ?? "");
  const [saving, setSaving] = useState(false);

  const nameNext = draftName.trim() ? draftName.trim() : null;
  const dirty = nameNext !== (entry.name ?? null);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/h/${entry.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameNext }),
      });
      if (!res.ok) throw new Error();
      onSaved({ name: nameNext });
      onOpenChange(false);
    } catch {
      // Leave the sheet open so the user can retry.
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-4 pb-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink">
          <HugeiconsIcon icon={HouseIcon} size={26} strokeWidth={1.7} aria-hidden />
        </span>
        <div className="min-w-0">
          <DrawerTitle className="truncate text-2xl font-semibold tracking-tight text-ink">
            {labelFor(entry)}
          </DrawerTitle>
          <DrawerDescription className="text-pretty text-sm text-ink-soft">
            Give this home a name, or manage it on this device.
          </DrawerDescription>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty && !saving) void save();
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="household-name" className="text-sm font-medium text-ink">
          Name
        </label>
        <input
          id="household-name"
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={entry.code ?? "Name this home"}
          maxLength={60}
          className="no-ios-zoom w-full rounded-xl bg-surface-muted px-3.5 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-healthy/50"
        />
        <p className="text-xs text-ink-soft">
          {entry.code
            ? `Leave empty to use its code, “${entry.code}”.`
            : "Leave empty to use its short code."}
        </p>

        <button
          type="submit"
          disabled={!dirty || saving}
          className={`mt-2 h-12 w-full rounded-full bg-healthy text-base font-semibold text-canvas ${tapScale} hover:bg-healthy/90 disabled:opacity-60`}
        >
          {saving ? "Saving…" : "Save name"}
        </button>
      </form>

      <div className="my-5 h-px bg-ink/10" />

      {isDefault ? (
        <div className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-healthy/10 text-base font-semibold text-healthy-ink">
          <HugeiconsIcon icon={HouseHeartIcon} size={18} strokeWidth={2} aria-hidden />
          Your default home
        </div>
      ) : (
        <button
          type="button"
          onClick={onSetDefault}
          disabled={saving}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-muted text-base font-semibold text-ink ${tapScale} hover:bg-surface-muted/70 disabled:opacity-60`}
        >
          <HugeiconsIcon
            icon={HouseHeartIcon}
            size={18}
            strokeWidth={1.8}
            aria-hidden
          />
          Set as default home
        </button>
      )}

      {canRemove ? (
        <>
          <div className="my-5 h-px bg-ink/10" />
          <button
            type="button"
            onClick={onRemoved}
            disabled={saving}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-muted text-base font-semibold text-danger-ink ${tapScale} hover:bg-danger/10 disabled:opacity-60`}
          >
            <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.9} aria-hidden />
            Remove from this device
          </button>
          <p className="px-2 pt-2 text-center text-pretty text-xs text-ink-soft">
            This only forgets the link on this browser. Your plants and the
            shared link stay intact.
          </p>
        </>
      ) : null}
    </div>
  );
}
