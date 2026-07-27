import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A household is identified solely by its unguessable `id` token, which lives
 * in the URL (`/h/<token>`). Whoever has the link is in — the secret is the
 * permission. The token is generated app-side with nanoid (21 chars) so it is
 * brute-force resistant; see the create-household route (step 2).
 *
 * `display_code` is a friendly word-pair label (e.g. "maple-otter") shown in
 * the switcher. It is NOT a secret and never appears in a URL — it just gives
 * each household a memorable, consistent handle until the user sets a `name`.
 *
 * `avatar` is an optional emoji the household picks for itself (no uploads, like
 * plants); the switcher shows it, falling back to a house glyph when unset.
 */
export const households = pgTable("households", {
  id: text("id").primaryKey(),
  name: text("name"),
  displayCode: text("display_code"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A plant belongs to exactly one household. Care fields (intervals + notes +
 * common name) are snapshotted from the local species dataset at add time and
 * are thereafter self-contained and editable.
 */
export const plants = pgTable(
  "plants",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    room: text("room"),
    // Legacy provenance column, now always null (local species keys are strings,
    // not integers); safe to drop later.
    speciesId: integer("species_id"),
    // The local species this plant was created from (kebab-case key from the
    // dataset), or null for manual entries. Keeps the link to the species
    // template so care fields can be reverted to the provided defaults — both in
    // the add flow and when editing the plant later.
    speciesKey: text("species_key"),
    commonName: text("common_name"),
    // Emoji glyph — the default avatar and the fallback whenever no photo is set.
    avatar: text("avatar"),
    // Object-storage key for an uploaded avatar photo (see src/lib/storage.ts),
    // or null. When set it takes precedence over the emoji; the public URL is
    // derived from the key at read time so the storage provider stays swappable.
    avatarImageKey: text("avatar_image_key"),

    // Water
    lastWatered: timestamp("last_watered", { withTimezone: true }),
    waterIntervalDays: integer("water_interval_days"),
    waterNote: text("water_note"),

    // Light
    lightNote: text("light_note"),

    // Feed
    lastFed: timestamp("last_fed", { withTimezone: true }),
    feedIntervalDays: integer("feed_interval_days"),
    feedNote: text("feed_note"),

    // Free-text personal notes.
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Every read is "this household's plants, oldest first" — Postgres doesn't
    // index foreign keys for you, so without this each page load is a sequential
    // scan plus a sort.
    index("plants_household_id_created_at_idx").on(t.householdId, t.createdAt),
  ],
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
