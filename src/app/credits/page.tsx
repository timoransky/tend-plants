import type { Metadata } from "next";
import Link from "next/link";

import { FALLBACK_SPECIES } from "@/data/fallback-species";
import { SPECIES_IMAGES } from "@/data/species-images";

export const metadata: Metadata = {
  title: "Photo credits · Tend",
  description:
    "Attribution for the reference plant photos used in the add-plant picker.",
};

/**
 * Attribution for the species reference photos shown in the add-plant picker.
 * The photos are provided by Pexels under the Pexels License; the Pexels API
 * Guidelines ask for a link back to Pexels and photographer credit, which this
 * page provides in one place (linked from the picker and the species confirm
 * view). Ordered to match the dataset so it reads like the picker.
 */
export default function CreditsPage() {
  const credited = FALLBACK_SPECIES.map((s) => ({
    key: s.key,
    name: s.commonName,
    images: SPECIES_IMAGES[s.key] ?? [],
  })).filter((s) => s.images.length > 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-cream">
      <h1 className="text-2xl font-semibold tracking-tight">Photo credits</h1>
      <p className="mt-2 text-sm text-cream-soft">
        Reference photos in the add-plant picker are provided by{" "}
        <a
          href="https://www.pexels.com"
          className="underline underline-offset-2 hover:text-cream"
          target="_blank"
          rel="noreferrer"
        >
          Pexels
        </a>{" "}
        under the Pexels License. Thanks to the photographers who share their
        work.
      </p>

      <ul className="mt-8 flex flex-col gap-5">
        {credited.map((s) => (
          <li key={s.key}>
            <h2 className="text-sm font-semibold text-cream">{s.name}</h2>
            <ul className="mt-1 flex flex-col gap-0.5">
              {s.images.map((img) => (
                <li key={img.src} className="text-xs text-cream-soft">
                  <a
                    href={img.sourceUrl || undefined}
                    className="underline underline-offset-2 hover:text-cream"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {img.author}
                  </a>
                  {" — "}
                  {img.licenseUrl ? (
                    <a
                      href={img.licenseUrl}
                      className="hover:text-cream"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {img.license}
                    </a>
                  ) : (
                    img.license
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm">
        <Link href="/" className="text-cream-soft underline underline-offset-2 hover:text-cream">
          ← Back to Tend
        </Link>
      </p>
    </main>
  );
}
