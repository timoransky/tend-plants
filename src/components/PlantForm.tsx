"use client";

import { CameraAdd01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";

import { DrawerDescription, DrawerTitle } from "@/components/Drawer";
import { PlantAvatar } from "@/components/PlantAvatar";
import { SHOW_FEED } from "@/lib/features";
import { downscaleImage } from "@/lib/image";
import { roomIcon } from "@/lib/room-icon";
import type { SpeciesDetail } from "@/lib/species";
import { buttonLg, tapScale } from "@/lib/ui";
import { ICON_MD, ICON_SM } from "@/lib/icons";

const AVATAR_CHOICES = ["🌿", "🪴", "🌵", "🌱", "🌴", "🍃", "🌸", "🌼", "🌺"];

/** The full set of editable fields, kept as strings for controlled inputs. */
export type PlantFormValues = {
  name: string;
  room: string;
  avatar: string;
  // An uploaded avatar photo: the storage object key (sent on save) and its
  // public URL (for preview). Both null when the avatar is the emoji. A photo,
  // when present, wins over the emoji everywhere it's shown.
  avatarImageKey: string | null;
  avatarImageUrl: string | null;
  waterIntervalDays: string;
  waterNote: string;
  lightNote: string;
  feedIntervalDays: string;
  feedNote: string;
  notes: string;
};

/** Species-derived fields — the ones "reset to defaults" restores. Room and
 * personal notes are user-only and deliberately excluded. */
const SPECIES_KEYS = [
  "name",
  "avatar",
  "waterIntervalDays",
  "waterNote",
  "lightNote",
  "feedIntervalDays",
  "feedNote",
] as const satisfies readonly (keyof PlantFormValues)[];

/** Seed form values from a species (for the add flow's initial state). */
export function speciesToValues(s: SpeciesDetail): PlantFormValues {
  return {
    name: s.commonName,
    room: "",
    avatar: s.avatar,
    avatarImageKey: null,
    avatarImageUrl: null,
    waterIntervalDays: String(s.waterIntervalDays),
    waterNote: s.waterNote,
    lightNote: s.lightNote,
    feedIntervalDays: String(s.feedIntervalDays),
    feedNote: s.feedNote,
    notes: "",
  };
}

/** Empty defaults for a manual (non-species) entry. */
export const MANUAL_VALUES: PlantFormValues = {
  name: "",
  room: "",
  avatar: "🪴",
  avatarImageKey: null,
  avatarImageUrl: null,
  waterIntervalDays: "7",
  waterNote: "",
  lightNote: "",
  feedIntervalDays: "30",
  feedNote: "",
  notes: "",
};

/**
 * The shared plant care form: name, room, avatar, water/light/feed and personal
 * notes. Reused by both the add flow (seeded from a species or blank, POSTs a
 * new plant) and the edit sheet (seeded from an existing plant, PATCHes it).
 *
 * Owns its own field/submitting/error state; the caller supplies `onSubmit`,
 * which does the network write (and may throw to surface an inline error). When
 * a `species` is given, a "reset to defaults" control restores the
 * species-derived fields (leaving room/notes untouched).
 *
 * Renders the drawer header (the live avatar circle + `title`/`subtitle`),
 * which doubles as vaul's required `DrawerTitle`, so it must be rendered inside
 * an open `<Drawer>`.
 */
export function PlantForm({
  initial,
  species,
  token,
  rooms,
  photoEnabled,
  pendingPhoto,
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  onSubmit,
}: {
  initial: PlantFormValues;
  species: SpeciesDetail | null;
  token: string;
  // Existing room names, shown as tappable chips; empty falls back to a plain
  // free-text input (no regression when a household has no rooms yet).
  rooms: string[];
  photoEnabled: boolean;
  // A photo handed in from the identify flow to become this plant's avatar.
  // Previewed instantly (local blob) and uploaded in the background, so it's
  // applied without an extra tap. Null/omitted for the picker and edit flows.
  pendingPhoto?: Blob | null;
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: PlantFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<PlantFormValues>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The uploaded photo, kept for this form session independently of whether it's
  // the *active* avatar. Choosing an emoji only deactivates it (clears
  // values.avatarImage*); the photo stays here as a swatch so switching back is
  // one tap, never a re-upload. Seeded from an existing plant's photo on edit.
  const [photo, setPhoto] = useState<{ key: string; url: string } | null>(
    initial.avatarImageKey && initial.avatarImageUrl
      ? { key: initial.avatarImageKey, url: initial.avatarImageUrl }
      : null,
  );

  const set = (patch: Partial<PlantFormValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  // Room chips: the household's existing rooms, plus the plant's own saved room
  // if it isn't among them (so an edited plant's room still shows + highlights).
  // "+ New room" opens a free-text input for a genuinely new one.
  const [customRoom, setCustomRoom] = useState(false);
  const chipRooms = useMemo(() => {
    const base = [...rooms];
    const own = initial.room.trim();
    if (own && !base.some((r) => r.toLowerCase() === own.toLowerCase())) {
      base.unshift(own);
    }
    return base;
  }, [rooms, initial.room]);

  // Take/choose a photo → downscale → upload → use it as this plant's avatar.
  // The photo overrides the emoji; picking an emoji below deactivates it (but
  // keeps it available as a swatch to re-select).
  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const blob = await downscaleImage(file).catch(() => file);
      const body = new FormData();
      body.append("image", blob, "avatar.jpg");
      const res = await fetch(`/api/h/${token}/avatar`, {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error();
      const { key, url } = (await res.json()) as { key: string; url: string };
      setPhoto({ key, url });
      set({ avatarImageKey: key, avatarImageUrl: url });
    } catch {
      setError("Couldn’t upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // Absorb a photo handed in from identify (runs once — the form is remounted
  // per open): preview it instantly from a local blob URL, then upload it and
  // swap in the stored key/URL. `uploading` disables submit until it lands. All
  // state updates happen inside the async task (never synchronously in the
  // effect body) so they don't trigger cascading renders.
  useEffect(() => {
    if (!pendingPhoto || !photoEnabled) return;
    let active = true;
    const localUrl = URL.createObjectURL(pendingPhoto);
    (async () => {
      setUploading(true);
      setValues((v) => ({
        ...v,
        avatarImageUrl: localUrl,
        avatarImageKey: null,
      }));
      try {
        const body = new FormData();
        body.append("image", pendingPhoto, "avatar.jpg");
        const res = await fetch(`/api/h/${token}/avatar`, {
          method: "POST",
          body,
        });
        if (!res.ok) throw new Error();
        const { key, url } = (await res.json()) as { key: string; url: string };
        if (active) {
          setPhoto({ key, url });
          setValues((v) => ({
            ...v,
            avatarImageKey: key,
            avatarImageUrl: url,
          }));
        }
      } catch {
        if (active) {
          setValues((v) => ({
            ...v,
            avatarImageKey: null,
            avatarImageUrl: null,
          }));
          setError("Couldn’t attach that photo. Pick an avatar below.");
        }
      } finally {
        if (active) setUploading(false);
        URL.revokeObjectURL(localUrl);
      }
    })();
    return () => {
      active = false;
    };
    // Runs once for this form instance; deps intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaults = useMemo(
    () => (species ? speciesToValues(species) : null),
    [species],
  );

  const isDirty = useMemo(() => {
    if (!defaults) return false;
    return SPECIES_KEYS.some((k) => defaults[k] !== values[k]);
  }, [defaults, values]);

  function resetToDefaults() {
    if (!defaults) return;
    const patch: Partial<PlantFormValues> = {};
    for (const k of SPECIES_KEYS) patch[k] = defaults[k];
    set(patch);
  }

  // Stable avatar palette: the standard choices, plus the seeded avatar and the
  // species' own emoji if they aren't already among them — so an existing or
  // species-specific emoji shows up (and highlights) without the row reshuffling
  // as the user taps around.
  const avatarChoices = useMemo(() => {
    const extras = [initial.avatar, species?.avatar].filter(
      (a): a is string => !!a && !AVATAR_CHOICES.includes(a),
    );
    return [...new Set([...extras, ...AVATAR_CHOICES])];
  }, [initial.avatar, species]);

  async function submit() {
    const name = values.name.trim();
    if (!name) {
      setError("Please give your plant a name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ ...values, name });
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-4 pb-5">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-muted text-4xl">
          <PlantAvatar
            avatar={values.avatar || "🪴"}
            imageUrl={values.avatarImageUrl}
            alt={values.name}
          />
        </span>
        <div className="min-w-0">
          <DrawerTitle className="truncate text-2xl font-semibold tracking-tight text-ink">
            {title}
          </DrawerTitle>
          <DrawerDescription className="truncate text-sm text-ink-soft">
            {subtitle}
          </DrawerDescription>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Monty"
            className="input"
          />
        </Field>

        {chipRooms.length === 0 ? (
          <Field label="Room">
            <input
              value={values.room}
              onChange={(e) => set({ room: e.target.value })}
              placeholder="e.g. Living Room"
              className="input"
            />
          </Field>
        ) : (
          // A plain <div>, NOT a <label>: a label wrapping several buttons
          // forwards any inner click to its first control, which would flash the
          // first chip whenever another was tapped.
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Room
            </span>
            <div className="flex flex-wrap gap-1.5">
              {chipRooms.map((room) => {
                const selected =
                  !customRoom &&
                  values.room.trim().toLowerCase() === room.toLowerCase();
                return (
                  <button
                    key={room}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setCustomRoom(false);
                      set({ room: selected ? "" : room });
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${tapScale} ${
                      selected
                        ? "bg-healthy/20 text-ink ring-2 ring-healthy"
                        : "bg-surface-muted text-ink hover:bg-surface-muted/70"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={roomIcon(room)}
                      size={ICON_SM}
                      strokeWidth={1.9}
                      aria-hidden
                    />
                    {room}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setCustomRoom(true);
                  set({ room: "" });
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm ${tapScale} ${
                  customRoom
                    ? "border-ink/50 text-ink"
                    : "border-ink/30 text-ink-soft hover:border-ink/50 hover:text-ink"
                }`}
              >
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  size={ICON_SM}
                  strokeWidth={1.9}
                  aria-hidden
                />
                New room
              </button>
            </div>
            {customRoom ? (
              <input
                autoFocus
                value={values.room}
                onChange={(e) => set({ room: e.target.value })}
                placeholder="e.g. Conservatory"
                className="input"
              />
            ) : null}
          </div>
        )}

        <Field label="Avatar">
          <div className="flex flex-wrap gap-1.5">
            {/* Upload / change tile: opens the picker to take or choose a photo.
                Always present while uploads are configured, so a new photo is
                one tap away even when one is already set. */}
            {photoEnabled ? (
              <label
                aria-label={photo ? "Choose a different photo" : "Use a photo"}
                className={`flex size-10 cursor-pointer items-center justify-center rounded-xl bg-surface-muted text-ink-soft ${tapScale} hover:bg-surface-muted/70`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    // Reset so re-picking the same file still fires onChange.
                    e.target.value = "";
                    if (file) uploadPhoto(file);
                  }}
                />
                {uploading ? (
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink/70"
                    aria-label="Uploading"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={CameraAdd01Icon}
                    size={ICON_MD}
                    strokeWidth={1.9}
                    aria-hidden
                  />
                )}
              </label>
            ) : null}

            {/* The uploaded photo as its own selectable swatch. It stays here
                even after an emoji is chosen, so switching back to the photo is
                one tap — the earlier bug was clearing it on emoji select. */}
            {photo ? (
              <button
                type="button"
                aria-label="Use the uploaded photo"
                aria-pressed={!!values.avatarImageUrl}
                onClick={() =>
                  set({ avatarImageKey: photo.key, avatarImageUrl: photo.url })
                }
                className={`size-10 overflow-hidden rounded-xl ${tapScale} ${
                  values.avatarImageUrl
                    ? "ring-2 ring-healthy"
                    : "hover:opacity-90"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            ) : null}

            {avatarChoices.map((emo) => {
              // While a photo is the active avatar no emoji is highlighted;
              // tapping an emoji deactivates the photo (but keeps its swatch).
              const selected = !values.avatarImageUrl && values.avatar === emo;
              return (
                <button
                  key={emo}
                  type="button"
                  onClick={() =>
                    set({
                      avatar: emo,
                      avatarImageKey: null,
                      avatarImageUrl: null,
                    })
                  }
                  className={`flex size-10 items-center justify-center rounded-xl text-xl ${tapScale} ${
                    selected
                      ? "bg-healthy/20 ring-2 ring-healthy"
                      : "bg-surface-muted hover:bg-surface-muted/70"
                  }`}
                >
                  {emo}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex items-center justify-between border-t border-ink/10 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Care
          </h2>
          {species ? (
            <button
              type="button"
              onClick={resetToDefaults}
              disabled={!isDirty}
              className="text-xs font-medium text-healthy-ink transition-opacity disabled:opacity-40"
            >
              ↺ Reset to {species.commonName} defaults
            </button>
          ) : null}
        </div>

        <Field label="Watering interval (approx. days)" accent="text-water-ink">
          <input
            type="number"
            min={1}
            value={values.waterIntervalDays}
            onChange={(e) => set({ waterIntervalDays: e.target.value })}
            className="input tabular-nums"
          />
        </Field>
        <Field label="Watering guidance" accent="text-water-ink">
          <textarea
            value={values.waterNote}
            onChange={(e) => set({ waterNote: e.target.value })}
            rows={2}
            placeholder="When to water…"
            className="input resize-none"
          />
        </Field>

        <Field label="Light guidance" accent="text-light-ink">
          <textarea
            value={values.lightNote}
            onChange={(e) => set({ lightNote: e.target.value })}
            rows={2}
            placeholder="Light preference…"
            className="input resize-none"
          />
        </Field>

        {SHOW_FEED ? (
          <>
            <Field label="Feeding interval (approx. days)" accent="text-feed-ink">
              <input
                type="number"
                min={1}
                value={values.feedIntervalDays}
                onChange={(e) => set({ feedIntervalDays: e.target.value })}
                className="input tabular-nums"
              />
            </Field>
            <Field label="Feeding note" accent="text-feed-ink">
              <textarea
                value={values.feedNote}
                onChange={(e) => set({ feedNote: e.target.value })}
                rows={2}
                placeholder="How to feed…"
                className="input resize-none"
              />
            </Field>
          </>
        ) : null}

        <Field label="Additional notes">
          <textarea
            value={values.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={2}
            placeholder="Anything personal to remember…"
            className="input resize-none"
          />
        </Field>
      </div>

      {error ? <p className="pt-4 text-sm text-water-ink">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || uploading || !values.name.trim()}
        className={`${buttonLg} mt-4 w-full bg-healthy text-canvas ${tapScale} hover:bg-healthy/90 disabled:opacity-60`}
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </>
  );
}

function Field({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className={`text-xs font-medium uppercase tracking-wide ${accent ?? "text-ink-soft"}`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
