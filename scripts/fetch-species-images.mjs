/**
 * Fetch reference photos for the local species dataset from Wikimedia Commons.
 *
 * WHY: the add-plant species picker lets people find their plant by name, but a
 * name alone ("Dracaena Marginata") doesn't tell someone unfamiliar with it
 * whether they picked the right plant. A photo does. This pulls a few
 * correctly-licensed reference photos per species, self-hosts them under
 * `public/species/`, and writes a manifest (`src/data/species-images.ts`) plus a
 * credits file (`public/species/CREDITS.md`).
 *
 * SOURCE: Wikimedia Commons — keyless, and filed by species so the photo is of
 * the *right* plant (stock sites tag loosely). Only CC0 / public-domain / CC BY
 * / CC BY-SA files are kept; each keeps its author + license for attribution.
 *
 * RUN:  node scripts/fetch-species-images.mjs [--only=key1,key2] [--max=3]
 * Re-runnable: it clears the per-key image files it manages before refetching.
 */
import { mkdir, rm, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "species");
const MANIFEST = join(ROOT, "src", "data", "species-images.ts");
const CREDITS = join(OUT_DIR, "CREDITS.md");

const UA =
  "tend-plants/1.0 (https://github.com/timoransky/tend-plants; houseplant care app) reference-image-fetch";
const THUMB_WIDTH = 300; // displayed small (~40px grid / ~120px strip); keeps files lean
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const MAX_PER_SPECIES = Number(args.max) || 3;

// key -> Wikipedia article title (scientific name where it disambiguates best).
// The picker's species come from src/data/fallback-species.ts; titles are the
// most reliable Commons anchor, so they live here rather than being guessed.
const SPECIES = [
  ["monstera", "Monstera", "Monstera deliciosa"],
  ["calathea", "Calathea", "Calathea"],
  ["aloe", "Aloe Vera", "Aloe vera"],
  ["fiddle-leaf-fig", "Fiddle Leaf Fig", "Ficus lyrata"],
  ["pothos", "Pothos", "Epipremnum aureum"],
  ["snake-plant", "Snake Plant", "Dracaena trifasciata"],
  ["zz-plant", "ZZ Plant", "Zamioculcas zamiifolia"],
  ["peace-lily", "Peace Lily", "Spathiphyllum wallisii"],
  ["spider-plant", "Spider Plant", "Chlorophytum comosum"],
  ["rubber-plant", "Rubber Plant", "Ficus elastica"],
  ["heartleaf-philodendron", "Heartleaf Philodendron", "Philodendron hederaceum"],
  ["phalaenopsis-orchid", "Phalaenopsis Orchid", "Phalaenopsis"],
  ["boston-fern", "Boston Fern", "Nephrolepis exaltata"],
  ["english-ivy", "English Ivy", "Hedera helix"],
  ["jade-plant", "Jade Plant", "Crassula ovata"],
  ["chinese-money-plant", "Chinese Money Plant", "Pilea peperomioides"],
  ["chinese-evergreen", "Chinese Evergreen", "Aglaonema"],
  ["dracaena-marginata", "Dracaena Marginata", "Dracaena marginata"],
  ["dieffenbachia", "Dieffenbachia", "Dieffenbachia"],
  ["croton", "Croton", "Codiaeum variegatum"],
  ["anthurium", "Anthurium", "Anthurium andraeanum"],
  ["bird-of-paradise", "Bird of Paradise", "Strelitzia reginae"],
  ["areca-palm", "Areca Palm", "Dypsis lutescens"],
  ["parlor-palm", "Parlor Palm", "Chamaedorea elegans"],
  ["majesty-palm", "Majesty Palm", "Ravenea rivularis"],
  ["ponytail-palm", "Ponytail Palm", "Beaucarnea recurvata"],
  ["norfolk-island-pine", "Norfolk Island Pine", "Araucaria heterophylla"],
  ["money-tree", "Money Tree", "Pachira aquatica"],
  ["lucky-bamboo", "Lucky Bamboo", "Dracaena sanderiana"],
  ["schefflera", "Schefflera", "Schefflera arboricola"],
  ["cast-iron-plant", "Cast Iron Plant", "Aspidistra elatior"],
  ["monstera-adansonii", "Monstera Adansonii", "Monstera adansonii"],
  ["philodendron-birkin", "Philodendron Birkin", "Philodendron Birkin"],
  ["string-of-pearls", "String of Pearls", "Curio rowleyanus"],
  ["echeveria", "Echeveria", "Echeveria"],
  ["haworthia", "Haworthia", "Haworthia"],
  ["christmas-cactus", "Christmas Cactus", "Schlumbergera"],
  ["kalanchoe", "Kalanchoe", "Kalanchoe blossfeldiana"],
  ["african-violet", "African Violet", "Streptocarpus ionanthus"],
  ["rex-begonia", "Rex Begonia", "Begonia rex"],
  ["tradescantia-inch-plant", "Tradescantia (Inch Plant)", "Tradescantia zebrina"],
  ["maidenhair-fern", "Maidenhair Fern", "Adiantum"],
  ["birds-nest-fern", "Bird's Nest Fern", "Asplenium nidus"],
  ["nerve-plant", "Nerve Plant (Fittonia)", "Fittonia albivenis"],
  ["prayer-plant", "Prayer Plant (Maranta)", "Maranta leuconeura"],
  ["polka-dot-plant", "Polka Dot Plant (Hypoestes)", "Hypoestes phyllostachya"],
  ["hoya-wax-plant", "Hoya (Wax Plant)", "Hoya carnosa"],
  ["string-of-hearts", "String of Hearts", "Ceropegia woodii"],
  ["bromeliad", "Bromeliad", "Guzmania"],
  ["air-plant-tillandsia", "Air Plant (Tillandsia)", "Tillandsia"],
];

// Hand-picked lead photos for species where the automatic search surfaced a
// flower / fruit / distant outdoor shot instead of the recognizable potted
// houseplant. These exact Commons files are used as the lead (grid) image;
// the rest of each species' strip still fills from the search. Curated by
// eyeballing candidate contact sheets — see scripts notes.
const PINS = {
  monstera: ["File:Monstera deliciosa Monstera dziurawa 2023-10-31 04.jpg"],
  calathea: ["File:Zebra Plant (Calathea zebrina) 1.jpg"],
  aloe: ["File:Potted Aloe vera plant.jpg"],
  "fiddle-leaf-fig": [
    "File:Starr-120513-5858-Ficus lyrata-leaves-Waihee Coastal Preserve-Maui (25024431542).jpg",
  ],
  "spider-plant": ["File:Chlorophytum comosum as an office plant.jpg"],
  "rubber-plant": ["File:Ficus November 2008-1.jpg"],
  "dracaena-marginata": ["File:Dracaena marginata IndoorPlant 0605k.jpg"],
  "areca-palm": ["File:Dypsis lutescens 2024-01-20 Malaga 01.jpg"],
  "parlor-palm": [
    "File:Chamaedorea elegans Chamedora wytworna 2024-01-20 Malaga 04.jpg",
  ],
  "ponytail-palm": ["File:Beaucarnea recurvata kz02.jpg"],
  "norfolk-island-pine": ["File:Ferns in pot.jpg"],
  "money-tree": ["File:Braided Money Tree Plant (Pachira aquatica) 1.jpg"],
  "monstera-adansonii": ["File:Monstera adansonii 2zz.jpg"],
  "english-ivy": ["File:Hedera helix 'Buttercup' Urn 2000px.JPG"],
  "jade-plant": ["File:Crassula ovata 2012.jpg"],
  dieffenbachia: ["File:Dieffenbachia seguine plant, April 2023.jpg"],
  "lucky-bamboo": ["File:Many Dracaena sanderiana.jpg"],
  "snake-plant": ["File:Snake Plant (Sansevieria trifasciata 'Laurentii') 2.jpg"],
  "majesty-palm": ["File:Starr 080103-1158 Ravenea rivularis.jpg"],
};

const COMMONS = "https://commons.wikimedia.org/w/api.php";
const WIKI = "https://en.wikipedia.org/w/api.php";

async function api(base, params) {
  const url = base + "?" + new URLSearchParams({ ...params, format: "json" });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) return await res.json();
    } catch {
      /* retry */
    }
    await sleep(500 * (attempt + 1));
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Download bytes with backoff — Commons thumb rendering 429s under load.
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status !== 429 && res.status < 500) throw new Error(String(res.status));
    } catch (e) {
      if (attempt === 4) throw e;
    }
    await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s, 8s, 16s
  }
  throw new Error("retries exhausted");
}
const stripHtml = (s) =>
  (s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Acceptable free licenses (attribution or none): CC0, public domain, CC BY(-SA).
function licenseOk(short) {
  const s = (short || "").toLowerCase();
  if (/non-free|fair use|no license|all rights/.test(s)) return false;
  return /cc0|public domain|\bpdm\b|cc[ -]by/.test(s);
}

async function leadFile(title) {
  const d = await api(WIKI, {
    action: "query",
    titles: title,
    prop: "pageimages",
    piprop: "name",
    redirects: "1",
  });
  const pages = d?.query?.pages ?? {};
  for (const p of Object.values(pages)) {
    if (p.pageimage) return "File:" + p.pageimage;
  }
  return null;
}

async function searchFiles(title) {
  const d = await api(COMMONS, {
    action: "query",
    list: "search",
    srsearch: title,
    srnamespace: "6",
    srlimit: "12",
  });
  return (d?.query?.search ?? []).map((r) => r.title);
}

async function fileInfo(titles) {
  // batch up to 20 File: titles
  const d = await api(COMMONS, {
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: String(THUMB_WIDTH),
  });
  const out = {};
  const pages = d?.query?.pages ?? {};
  for (const p of Object.values(pages)) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const em = ii.extmetadata ?? {};
    out[p.title] = {
      title: p.title,
      mime: ii.mime,
      width: ii.width,
      height: ii.height,
      thumburl: ii.thumburl,
      descriptionurl: ii.descriptionurl,
      license: stripHtml(em.LicenseShortName?.value) || "Unknown",
      licenseUrl: em.LicenseUrl?.value || "",
      author: stripHtml(em.Artist?.value) || "Wikimedia Commons contributor",
    };
  }
  return out;
}

const extFor = (mime) =>
  mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

// Remove image files no longer referenced by the manifest (e.g. after the
// candidate set changes between runs), leaving CREDITS.md / .gitkeep alone.
async function sweepOrphans(manifest) {
  const keep = new Set(
    Object.values(manifest)
      .flat()
      .map((e) => e.src.replace("/species/", "")),
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

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const only = args.only ? String(args.only).split(",") : null;
  const list = only ? SPECIES.filter(([k]) => only.includes(k)) : SPECIES;

  const manifest = {}; // key -> [{src, author, license, licenseUrl, sourceUrl}]
  const missing = [];

  for (const [key, , title] of list) {
    // Candidate files: hand-picked pins first (so they lead), then the
    // Wikipedia lead, then Commons search hits.
    const candidates = [];
    for (const p of PINS[key] ?? []) {
      if (!candidates.includes(p)) candidates.push(p);
    }
    const lead = await leadFile(title);
    if (lead && !candidates.includes(lead)) candidates.push(lead);
    for (const t of await searchFiles(title)) {
      if (!candidates.includes(t)) candidates.push(t);
    }
    const info = candidates.length
      ? await fileInfo(candidates.slice(0, 20))
      : {};

    // Keep candidate order (lead first); filter to usable, licensed images.
    const usable = candidates
      .map((t) => info[t])
      .filter(
        (f) =>
          f &&
          f.thumburl &&
          /^image\/(jpeg|png|webp)$/.test(f.mime) &&
          f.width >= 400 &&
          licenseOk(f.license),
      );

    const chosen = usable.slice(0, MAX_PER_SPECIES);
    if (!chosen.length) {
      missing.push(key);
      console.log(`  ✗ ${key.padEnd(24)} no usable image`);
      continue;
    }

    const entries = [];
    let n = 0;
    for (const f of chosen) {
      n += 1;
      const ext = extFor(f.mime);
      const filename = `${key}-${n}.${ext}`;
      try {
        // Always download so the file on disk matches the metadata recorded for
        // it — Commons result order isn't guaranteed stable between runs, so
        // reusing a positional filename could mislabel its author/license.
        const buf = await download(f.thumburl);
        await writeFile(join(OUT_DIR, filename), buf);
        await sleep(300); // pace downloads to avoid 429s
        entries.push({
          src: `/species/${filename}`,
          author: f.author,
          license: f.license,
          licenseUrl: f.licenseUrl,
          sourceUrl: f.descriptionurl,
        });
      } catch (e) {
        n -= 1;
        console.log(`    ! ${key} image ${n + 1} download failed: ${e.message}`);
      }
    }
    if (entries.length) {
      manifest[key] = entries;
      console.log(
        `  ✓ ${key.padEnd(24)} ${entries.length} img  [${entries.map((e) => e.license).join(", ")}]`,
      );
    } else {
      missing.push(key);
    }
    await sleep(200); // be polite to the API
  }

  await writeManifest(manifest);
  await writeCredits(manifest);
  await sweepOrphans(manifest);

  const total = Object.values(manifest).reduce((a, e) => a + e.length, 0);
  console.log(
    `\nDone. ${Object.keys(manifest).length}/${list.length} species with photos, ${total} images.`,
  );
  if (missing.length)
    console.log(`No photo (emoji fallback): ${missing.join(", ")}`);
}

async function writeManifest(manifest) {
  const keys = Object.keys(manifest).sort();
  const body = keys
    .map((k) => {
      const rows = manifest[k]
        .map(
          (e) =>
            `    { src: ${JSON.stringify(e.src)}, author: ${JSON.stringify(
              e.author,
            )}, license: ${JSON.stringify(e.license)}, licenseUrl: ${JSON.stringify(
              e.licenseUrl,
            )}, sourceUrl: ${JSON.stringify(e.sourceUrl)} },`,
        )
        .join("\n");
      return `  ${JSON.stringify(k)}: [\n${rows}\n  ],`;
    })
    .join("\n");

  const ts = `/**
 * Reference photos per species, sourced from Wikimedia Commons and self-hosted
 * under public/species/. GENERATED by scripts/fetch-species-images.mjs — do not
 * edit by hand; re-run the script to refresh.
 *
 * Shown in the add-plant species picker so people can confirm they picked the
 * right plant by sight, not just by an unfamiliar name. \`author\`/\`license\` are
 * kept for the /credits page (CC BY / CC BY-SA require attribution).
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
    "Reference photos in the add-plant picker come from Wikimedia Commons.",
    "Each is used under its stated license (CC0 / public domain / CC BY / CC BY-SA).",
    "",
  ];
  for (const k of keys) {
    lines.push(`## ${k}`);
    for (const e of manifest[k]) {
      lines.push(
        `- ${e.author} — ${e.license}${e.sourceUrl ? ` — ${e.sourceUrl}` : ""}`,
      );
    }
    lines.push("");
  }
  await writeFile(CREDITS, lines.join("\n"));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
