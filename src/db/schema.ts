import { sql } from "drizzle-orm";
import {
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
 */
export const households = pgTable("households", {
  id: text("id").primaryKey(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A plant belongs to exactly one household. Care fields (intervals + notes +
 * common name) are snapshotted from Perenual at add time and are thereafter
 * self-contained and editable; Perenual is never on the render path.
 */
export const plants = pgTable("plants", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  room: text("room"),
  // Perenual species id this plant was created from; null for manual entries.
  speciesId: integer("species_id"),
  commonName: text("common_name"),
  // Emoji or stock image key — no uploads in v1.
  avatar: text("avatar"),

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
});

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
