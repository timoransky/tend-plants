import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Tend — shared plant care";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fetch just the glyphs we render from the Google Fonts API and hand the raw font
// buffer to Satori. The CSS endpoint serves a truetype `src` to non-browser UAs,
// which is the format ImageResponse needs.
async function loadGoogleFont(family: string, weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`Could not resolve Google Font ${family} ${weight}`);
  return fetch(match[1]).then((res) => res.arrayBuffer());
}

export default async function Image() {
  const [fredokaBold, fredokaRegular, logo] = await Promise.all([
    loadGoogleFont("Fredoka", 600, "Tend"),
    loadGoogleFont("Fredoka", 400, "shared plant care"),
    // The real app mark, reused from the favicon source.
    readFile(join(process.cwd(), "src/app/icon0.svg")),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  // Hex equivalents of the app's OKLCH design tokens — Satori can't parse OKLCH.
  const canvas = "#27201A"; // --color-canvas (warm charcoal)
  const cream = "#ECE7DC"; // --color-cream (wordmark)
  const creamSoft = "#B1A899"; // --color-cream-soft (tagline)

  // Subtle dot grid, echoing the inspiration — light dots on the dark canvas.
  const dotSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='${cream}' fill-opacity='0.06'><circle cx='0' cy='0' r='1'/><circle cx='40' cy='0' r='1'/><circle cx='0' cy='40' r='1'/><circle cx='40' cy='40' r='1'/><circle cx='20' cy='20' r='1'/></g></svg>`;
  const dotUrl = `data:image/svg+xml;base64,${Buffer.from(dotSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: canvas,
          backgroundImage: `url(${dotUrl})`,
          backgroundRepeat: "repeat",
          backgroundSize: "40px 40px",
          fontFamily: "Fredoka",
          color: cream,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={220} height={220} alt="" />
        <div
          style={{
            display: "flex",
            marginTop: 4,
            fontSize: 168,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          Tend
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 40,
            fontWeight: 400,
            color: creamSoft,
          }}
        >
          shared plant care
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fredoka", data: fredokaBold, weight: 600, style: "normal" },
        { name: "Fredoka", data: fredokaRegular, weight: 400, style: "normal" },
      ],
    },
  );
}
