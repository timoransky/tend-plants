/**
 * Fetch reference photos for the local species dataset from Pexels.
 *
 * WHY: the add-plant species picker lets people find their plant by name, but a
 * name alone ("Dracaena Marginata") doesn't tell someone unfamiliar with it
 * whether they picked the right plant. A photo does. This pulls a coherent,
 * hand-picked reference photo per species (plus a couple more for the confirm
 * strip), self-hosts them under `public/species/`, and writes a manifest
 * (`src/data/species-images.ts`) plus a credits file (`public/species/CREDITS.md`).
 *
 * SOURCE: Pexels — its curated stock reads as one consistent set (cleaner than a
 * Commons grab-bag). PICKS below are hand-reviewed lead photos per species; the
 * rest of each strip fills from the same search. The Pexels License allows free
 * commercial use; the Pexels API Guidelines ask for a link back to Pexels and
 * photographer credit, which the /credits page provides.
 *
 * RUN:  PEXELS_API_KEY=<key> node scripts/fetch-species-images.mjs [--max=3]
 * Get a free key at https://www.pexels.com/api/. Re-run to refresh.
 */
import { mkdir, rm, writeFile, readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "species");
const MANIFEST = join(ROOT, "src", "data", "species-images.ts");
const CREDITS = join(OUT_DIR, "CREDITS.md");
const DATASET = join(ROOT, "src", "data", "fallback-species.ts");

const KEY = process.env.PEXELS_API_KEY;
const CROP = 400; // square, self-hosted; displayed small (grid ~40px / strip ~96px)
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const MAX_PER_SPECIES = Number(args.max) || 3;

// Per-species search overrides where the plain common name is ambiguous.
const QUERIES = {
  "snake-plant": "sansevieria snake plant",
  croton: "croton codiaeum plant",
  "ponytail-palm": "beaucarnea ponytail palm",
  "norfolk-island-pine": "araucaria norfolk island pine",
  "cast-iron-plant": "aspidistra cast iron plant",
  "chinese-money-plant": "pilea peperomioides plant",
  "lucky-bamboo": "lucky bamboo dracaena",
  "money-tree": "pachira money tree plant",
  bromeliad: "guzmania bromeliad",
  "air-plant-tillandsia": "tillandsia air plant",
  "string-of-hearts": "ceropegia string of hearts",
  "string-of-pearls": "string of pearls senecio",
};

// Hand-picked lead photo (Pexels id) per species — chosen from candidate
// contact sheets for the most recognizable, coherent shot.
const PICKS = {
  monstera: 7318283, calathea: 36483658, aloe: 12448627, "fiddle-leaf-fig": 7084309,
  pothos: 14534666, "snake-plant": 29218657, "zz-plant": 4503744, "peace-lily": 4751967,
  "spider-plant": 31757820, "rubber-plant": 8989427, "heartleaf-philodendron": 36582295,
  "phalaenopsis-orchid": 18378607, "boston-fern": 16270192, "english-ivy": 7728872,
  "jade-plant": 1836600, "chinese-money-plant": 7180559, "chinese-evergreen": 3119964,
  "dracaena-marginata": 4299019, dieffenbachia: 7439365, croton: 36684052, anthurium: 30396852,
  "bird-of-paradise": 2377186, "areca-palm": 18063065, "parlor-palm": 37188193,
  "majesty-palm": 4596808, "ponytail-palm": 10785988, "norfolk-island-pine": 30664944,
  "money-tree": 7047366, "lucky-bamboo": 13677856, schefflera: 7462741, "cast-iron-plant": 6484637,
  "monstera-adansonii": 32286095, "philodendron-birkin": 28753971, "string-of-pearls": 13799658,
  echeveria: 14245929, haworthia: 5856066, "christmas-cactus": 34880906, kalanchoe: 2333906,
  "african-violet": 36581193, "rex-begonia": 34312913, "tradescantia-inch-plant": 5783142,
  "maidenhair-fern": 34046762, "birds-nest-fern": 34191732, "nerve-plant": 38542809,
  "prayer-plant": 4590442, "polka-dot-plant": 10999665, "hoya-wax-plant": 9297353,
  "string-of-hearts": 10592221, bromeliad: 37451410, "air-plant-tillandsia": 10194606,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pexels(path) {
  const url = "https://api.pexels.com/v1/" + path;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { Authorization: KEY } });
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) return null;
    } catch {
      /* retry */
    }
    await sleep(800 * 2 ** i);
  }
  return null;
}

async function download(url) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status !== 429 && r.status < 500) throw new Error(String(r.status));
    } catch (e) {
      if (i === 4) throw e;
    }
    await sleep(800 * 2 ** i);
  }
  throw new Error("retries exhausted");
}

const cropUrl = (original) =>
  `${original}?auto=compress&cs=tinysrgb&fit=crop&w=${CROP}&h=${CROP}`;
const entry = (p) => ({
  photo: p,
  author: p.photographer || "Pexels photographer",
  sourceUrl: p.url,
});

async function loadSpecies() {
  const src = await readFile(DATASET, "utf8");
  return [...src.matchAll(/key:\s*"([^"]+)",\s*\n\s*commonName:\s*"([^"]+)"/g)].map(
    (m) => ({ key: m[1], name: m[2] }),
  );
}
const queryFor = (s) =>
  QUERIES[s.key] ?? s.name.replace(/\s*\([^)]*\)/g, "").trim() + " plant";

async function run() {
  if (!KEY) {
    console.error("PEXELS_API_KEY is not set. Get a free key at https://www.pexels.com/api/");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const species = await loadSpecies();
  const manifest = {};
  const missing = [];

  for (const s of species) {
    const picked = PICKS[s.key];
    // Search fills the confirm strip; the picked photo (fetched by id) leads.
    const search = await pexels(
      "search?" + new URLSearchParams({ query: queryFor(s), per_page: "10" }),
    );
    const results = search?.photos ?? [];
    let lead = results.find((p) => p.id === picked);
    if (!lead && picked) {
      const one = await pexels(`photos/${picked}`);
      if (one?.id) lead = one;
    }
    const ordered = [];
    if (lead) ordered.push(lead);
    for (const p of results) {
      if (ordered.length >= MAX_PER_SPECIES) break;
      if (!ordered.some((q) => q.id === p.id)) ordered.push(p);
    }
    if (!ordered.length) {
      missing.push(s.key);
      console.log(`  ✗ ${s.key}`);
      continue;
    }

    const entries = [];
    let n = 0;
    for (const p of ordered) {
      n += 1;
      const filename = `${s.key}-${n}.jpg`;
      try {
        await writeFile(join(OUT_DIR, filename), await download(cropUrl(p.src.original)));
        const e = entry(p);
        entries.push({
          src: `/species/${filename}`,
          author: e.author,
          license: "Pexels License",
          licenseUrl: "https://www.pexels.com/license/",
          sourceUrl: e.sourceUrl,
        });
        await sleep(120);
      } catch (err) {
        n -= 1;
        console.log(`    ! ${s.key} image ${n + 1} failed: ${err.message}`);
      }
    }
    if (entries.length) {
      manifest[s.key] = entries;
      console.log(`  ✓ ${s.key.padEnd(24)} ${entries.length} img`);
    } else missing.push(s.key);
    await sleep(120);
  }

  await writeManifest(manifest);
  await writeCredits(manifest);
  await sweepOrphans(manifest);
  const total = Object.values(manifest).reduce((a, e) => a + e.length, 0);
  console.log(`\nDone. ${Object.keys(manifest).length}/${species.length} species, ${total} images.`);
  if (missing.length) console.log(`No photo (emoji fallback): ${missing.join(", ")}`);
}

async function writeManifest(manifest) {
  const keys = Object.keys(manifest).sort();
  const body = keys
    .map((k) => {
      const rows = manifest[k]
        .map(
          (e) =>
            `    { src: ${JSON.stringify(e.src)}, author: ${JSON.stringify(e.author)}, license: ${JSON.stringify(e.license)}, licenseUrl: ${JSON.stringify(e.licenseUrl)}, sourceUrl: ${JSON.stringify(e.sourceUrl)} },`,
        )
        .join("\n");
      return `  ${JSON.stringify(k)}: [\n${rows}\n  ],`;
    })
    .join("\n");
  const ts = `/**
 * Reference photos per species, sourced from Pexels and self-hosted under
 * public/species/. GENERATED by scripts/fetch-species-images.mjs — do not edit
 * by hand; re-run the script to refresh.
 *
 * Shown in the add-plant species picker so people can confirm they picked the
 * right plant by sight, not just an unfamiliar name. \`author\`/\`sourceUrl\` feed
 * the /credits page (the Pexels API asks for photographer + Pexels credit).
 */
export type SpeciesImage = {
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
};

export const SPECIES_IMAGES: Record<string, SpeciesImage[]> = {
${body}
};
`;
  await writeFile(MANIFEST, ts);
}

async function writeCredits(manifest) {
  const keys = Object.keys(manifest).sort();
  const lines = [
    "# Photo credits",
    "",
    "Reference photos in the add-plant picker are provided by Pexels",
    "(https://www.pexels.com) under the Pexels License. Thanks to the",
    "photographers who share their work.",
    "",
  ];
  for (const k of keys) {
    lines.push(`## ${k}`);
    for (const e of manifest[k]) {
      lines.push(`- ${e.author} — Pexels${e.sourceUrl ? ` — ${e.sourceUrl}` : ""}`);
    }
    lines.push("");
  }
  await writeFile(CREDITS, lines.join("\n"));
}

async function sweepOrphans(manifest) {
  const keep = new Set(
    Object.values(manifest).flat().map((e) => e.src.replace("/species/", "")),
  );
  let files = [];
  try {
    files = await readdir(OUT_DIR);
  } catch {
    return;
  }
  await Promise.all(
    files
      .filter((f) => /\.(jpg|png|webp)$/.test(f) && !keep.has(f))
      .map((f) => rm(join(OUT_DIR, f))),
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
