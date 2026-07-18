# Care-data decisions

Why the care data ships as a local dataset (`src/data/fallback-species.ts`) and
not from an external API. Read this before re-evaluating any "free plant care
API" — the same reasoning has now sunk two of them.

## The standing decision

Care data is a **curated local dataset**, snapshotted into each `plants` row at
add time. No external care API. Reasons that hold regardless of vendor:

- Status logic needs a **numeric interval stored locally** (`water_interval_days`,
  `feed_interval_days`) that the user can edit. A prose care guide doesn't give
  us that; we'd have to parse sentences into day-intervals.
- No key, no network dependency, no third-party uptime in the hot path, no
  rate limits, works offline.
- We control provenance. Every entry's water/light/feed values reflect the
  consensus of 2+ reputable horticultural sources (RHS, Missouri Botanical
  Garden, university extensions, Gardeners' World, Gardenia.net), with the
  source trail kept inline on each entry (`sources` / `disagreement`).

## Perenual — rejected (earlier, in review)

Free-tier care API. Dropped because the care **detail** was paywalled, the free
list was thinner than our curated one, and it needed a key. Local list is more
complete and needs no network.

## PlantSolve — evaluated 2026-07-18, rejected

`https://www.plantsolve.com/developers/` advertises a free, no-key, wildcard-CORS
JSON API (`/api/v1/plants/index.json`, `/api/v1/plants/{slug}.json`, etc.),
CC BY 4.0. Looked promising on paper. It does not hold up:

1. **The JSON API is not live.** Every documented endpoint — including the exact
   `fetch()` examples in their own docs — returns HTTP **301 → `/plants/`**
   (the HTML page), `Content-Type: text/html`, regardless of `Accept` header.
   The redirect is cache-`HIT`, i.e. stable, not a transient blip. No endpoint
   ever returns JSON. You cannot build on it.
2. **The underlying data is wrong-shaped anyway.** Real content lives in
   long-form HTML guides (~120 KB/plant), care info as prose paragraphs
   (Light / Watering / Fertilizer / Humidity / Temperature). **No numeric
   watering/feeding intervals** — the one field our status engine depends on.
3. **Coverage is cultivar-skewed.** Their ~102 guides lean to specific variants
   (Monstera siltepecana, Calathea orbifolia, Tradescantia Nanouk, Philodendron
   Brasil, Raven ZZ), not the generic species a household actually buys and that
   our dataset targets.
4. **Licensing + dependency.** CC BY 4.0 requires visible attribution and a
   canonical backlink; it's an anonymous site on Hostinger static hosting with
   a "free forever" promise and no entity behind it. Not something to make a
   core data dependency.

### Dataset cross-check outcome

Compared our 51 species against PlantSolve's card-level care signal (their only
structured data: coarse tags — `low-light`/`high-light`, `drought-tolerant`/
`humidity-loving`, difficulty bands). **On every comparable point their signal
agrees with our dataset** (e.g. ZZ & Cast Iron drought-tolerant + low light;
Calathea/Nerve/Prayer/Polka Dot humidity-loving; Aloe/Jade/String-of-Pearls
succulent; Bird of Paradise/Rubber/Fiddle bright light). Nothing factual to
import — our data is already as good or better, and more precisely sourced.
No changes were made to the dataset as a result of this review.

One thing PlantSolve tracks that we don't: **pet safety** (`pet-safe` /
`toxic-to-pets`). Genuinely useful for a houseplant app, but out of the v1
schema — noted as a possible future field, not adopted here.

## Plant photos — parked 2026-07-18 (revisit later)

Real product need: show plant **photos** in the add-plant flow (people recognize
plants visually, not by name). Decision for now: **keep emoji avatars** (matches
v1 scope); photos are a fast-follow whenever someone picks it up. This section is
the turnkey record so it doesn't need re-deriving.

**Where it slots in (don't guess again):**
- Target is the **species picker**, not the home grid. `AddPlant.tsx` renders
  `{s.avatar}` (emoji) per species — that's where a photo helps search. Leave
  `PlantBubble` (home) as emoji + status dot by design.
- Add an optional `image` to the species data → expose via `/api/species`
  (`searchSpeciesDetail`) → render photo **with emoji fallback** in the picker.
  Missing photo → today's emoji. No schema change needed on `plants` if we only
  show photos in the picker; snapshotting a photo onto a plant row is a later,
  bigger call.

**Sourcing — findings verified from the build environment 2026-07-18:**
- **Unsplash / Pexels** — correct license (free commercial use, *no attribution
  owed*), but the **search APIs require a free key** (`api.pexels.com` /
  `api.unsplash.com` both reachable, return `401` without one). Image CDNs
  (`images.pexels.com`, `images.unsplash.com`) are reachable and serve sized
  bytes. The old keyless `source.unsplash.com` is dead (`503`). **This is the
  recommended path** once a key exists.
- **Wikimedia Commons** — keyless, reachable, a photo for *every* species, but a
  license probe showed only ~1 in 6 is CC0/public-domain; the rest are
  CC BY / CC BY-SA (attribution owed). Viable only if we accept one light
  "Plant photos via Wikimedia Commons" credit line.
- **PlantSolve thumbnails** — CC BY 4.0 (attribution + backlink) *and* no working
  API to fetch them. Not viable.

**Pickup steps (Pexels path):** get a free key at `pexels.com/api` → set
`PEXELS_API_KEY` as an env var → script: for each species, search by name
(`?query=<name>&orientation=landscape&per_page=1`, `Authorization: <key>`),
download `photos[0].src` sized ~600×400, write `public/species/<key>.jpg` →
add the `image` field through `species.ts` + `/api/species` → render in the
picker with emoji fallback → verify the add flow end-to-end. ~51 requests, well
within the free tier (200/hr).
