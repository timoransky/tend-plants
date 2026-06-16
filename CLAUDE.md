@AGENTS.md

# Plant App — v1 Spec ("Fields" / working name)

> Full handover spec. We build in the documented slice order (see **Build order**), **one slice per step**, with a review between each. No AI features.

## What it is

A web app to track which houseplants need watering/feeding, shared across a household via a secret link. Shows at a glance what's overdue / due today / coming up. Shared state: anyone with the link sees the same data, so a household doesn't double-water or both forget. Each plant carries quick care info (water frequency, light, feed) plus free-text notes.

**The defining choice:** no user accounts. A "household" is identified by an unguessable token in the URL (`/h/<token>`). Whoever has the link is in. The secret *is* the permission. This removes auth entirely.

## Stack (decided)

- **Next.js** (App Router) on **Vercel**. NOTE: this repo runs a version of Next.js with breaking changes vs. training data — read `node_modules/next/dist/docs/` before writing framework code (per AGENTS.md).
- **Neon** Postgres as the single source of truth. Always fetch from the DB — no localStorage, no offline mode.
- **Drizzle ORM** over Neon's **pooled connection string** (PgBouncer-based) using the **Neon serverless driver**, so serverless functions don't exhaust connections.
- **Tailwind** + **Framer Motion** for UI and animation.
- `DATABASE_URL` (pooled) and `PERENUAL_API_KEY` are server-side only (Vercel env vars). The browser never sees either; the Perenual key is always proxied through a server route.
- Cold-start note: Neon free tier scales to zero; first request after idle adds ~300–500ms. Acceptable.

## Data model — two tables; the household token is the access key for everything

**`households`**
- `id` — PK, an unguessable token. Generate with `nanoid` (21 chars) or UUIDv4. **Not** a short code — must be brute-force resistant.
- `name` — optional ("The Novák house").
- `created_at`.

**`plants`**
- `id` — uuid.
- `household_id` — FK → households.id.
- `name` — e.g. "Monstera".
- `room` — e.g. "Living Room".
- `species_id` — Perenual species id this was created from (nullable; null for manual entries).
- `common_name` — species common name, snapshotted at add time.
- `avatar` — emoji or stock image key (no uploads in v1).
- `last_watered` — timestamp, nullable.
- `water_interval_days` — int, snapshotted from Perenual at add time, **editable**.
- `water_note` — short watering description, snapshotted.
- `light_note` — short light description, snapshotted.
- `last_fed` — timestamp, nullable.
- `feed_interval_days` — int, nullable.
- `feed_note` — short feeding description, snapshotted.
- `notes` — free text (personal notes).
- `created_at`.

### Status logic (core mechanic)

For each plant, compute from `last_watered + water_interval_days`:
- **Overdue** → past due (blue, urgent)
- **Due today** → due now (blue)
- **Upcoming** → due within the next day or two (neutral)
- **Fine** → not due (green)

Same pattern for feed → brown indicator. Computed status drives the **status dot** on each avatar and the ordering of the home **timeline**. Do not store fixed clock times — status is derived from intervals.

## Access pattern (capability URL)

All DB access goes through Next.js route handlers that take the household token and filter every query by `household_id`. Connection string stays server-side.

Routes:
- `POST /api/household` → create a household, return its token.
- `GET /api/h/[token]/plants` → all plants + computed status.
- `POST /api/h/[token]/plants` → add a plant.
- `PATCH /api/h/[token]/plants/[id]` → edit (name, room, intervals, notes).
- `POST /api/h/[token]/plants/[id]/water` → set `last_watered = now()`.
- `POST /api/h/[token]/plants/[id]/feed` → set `last_fed = now()`.
- `GET /api/species?q=<name>` → proxy Perenual species search server-side (key hidden). Empty `q` returns a "common species" first page.
- `GET /api/species/[id]` → proxy a single species' care detail.

Sharing = copy the URL. No invites, no roles. Tradeoff (acceptable for a trusted household): anyone with the link has full edit access forever; revoking means rotating the token.

## Screens (directional reference, not pixel-clone; use an original name/logo)

1. **Home** — header (logo left, `+` add right); plant grid of circular avatars with name, room, and a **status dot** (blue = water, brown = feed, green = fine); paginated/carousel if many. Bottom sheet with **Today / Upcoming** tabs + search; a timeline of care tasks ordered by urgency, completed items checked off and struck through.
2. **Plant detail / care sheet** — segmented control **Feed / Water / Light** (brown / blue / yellow); three care cards each a short sentence from species data plus personal **notes**; primary actions **Mark watered / Mark fed** that hit the routes and update status immediately with animation.
3. **Add / edit plant** — browse/search species via Perenual (list of common houseplants, search filters by name); tapping a species shows care detail; on confirm **snapshot** care fields into the new row, then set name, room, avatar, intervals (pre-filled). If Perenual is down / has no data, fall back to manual entry seeded by the local fallback list.

## Perenual API — add-time lookup, snapshotted into DB (never on render path)

1. In add-plant flow, call Perenual server-side to browse common species (`species-list`) or search (`species-list?q=`).
2. When user picks a species, copy care fields into the new `plants` row (interval, water/light/feed notes, common name).
3. Plant is then self-contained: home, status logic, care sheet all read from Neon. Perenual never called again for that plant; intervals freely editable.

Why snapshot: free tier capped at **100 req/day** (only hit while adding); status needs interval stored locally; edited intervals make the API value irrelevant; app keeps working if Perenual is down.

Endpoints (proxied so key stays server-side):
- `GET https://perenual.com/api/v2/species-list?key=...&q=<name>&page=<n>` — browse/search.
- `GET https://perenual.com/api/v2/species-care-guide-list?species_id=<id>&key=...` — richer care detail.

Data-quality handling:
- Watering is often qualitative ("Frequent" / "Average" / "Minimum") or a range. Map to `water_interval_days` with a small table — e.g. Frequent → 5, Average → 7, Minimum → 14 — and prefer numeric `watering_general_benchmark` when present.
- Free tier covers species IDs **1–3000**. If a species lacks data, fall back to manual interval entry.

**Local fallback list:** tiny hardcoded JSON (~8 plants: Monstera, Calathea, Aloe, Fiddle Leaf Fig, Pothos, Snake Plant, ZZ Plant, Peace Lily) for dev/offline and when Perenual returns nothing. Same shape as a snapshotted row.

*Optional (not v1):* cache fetched species in a `species_cache` table.

## Design direction

Warm off-white/cream surfaces on a soft dark background; generously rounded cards; large friendly type; color-coded throughout (blue = water, brown = feed, yellow = light, green = healthy). The bottom-sheet pattern is central. "Make it feel great" = restrained but fluid — pick one or two signature motions (bottom-sheet drag/expand, the Mark-watered status transition blue→green with item check-off, the Feed/Water/Light segmented slide) and do them well. Keep everything else calm.

## Build order (one slice per step; review between each)

1. Scaffold Next.js + Tailwind; wire Neon (pooled driver) + Drizzle; define schema + run migration; add the local fallback species list.
2. Server routes: create household, get plants (computed status), water, feed, add, edit, plus Perenual search/detail proxies.
3. Home screen reading **real** data from a freshly created household. (After this: usable, shareable app.)
4. Plant detail + working Mark watered / Mark fed.
5. Add-plant flow: Perenual browse/search → care detail → snapshot into a new plant.
6. Animation + polish pass.
7. Deploy to Vercel; set `DATABASE_URL` and `PERENUAL_API_KEY`.

## Out of scope for v1 (do not build)

AI of any kind; photo uploads (emoji/stock avatars only); real auth / user accounts (token is the auth); push notifications; per-plant custom schedules beyond simple day intervals.
