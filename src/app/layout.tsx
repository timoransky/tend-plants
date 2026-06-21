import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ScrollReset } from "@/components/ScrollReset";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tend — shared plant care",
  description:
    "Track which houseplants need watering and feeding, shared across your household via a secret link.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        {/* The app shell — not the document — is the scroll container. Keeping
            <html>/<body> unscrolled (scrollTop always 0) is what lets vaul's
            drag-to-dismiss work: its hit-test climbs from the dragged sheet up
            to <body>, and bails if it meets a scrollable ancestor that isn't at
            the top. With the page itself scrollable, dragging a drawer shut
            silently failed whenever the page behind it was scrolled.

            vaul also scales this wrapper when a drawer opens
            (shouldScaleBackground); it needs its own background so it stays
            cream-on-canvas while the body behind it darkens. */}
        <div
          data-vaul-drawer-wrapper=""
          className="flex h-dvh flex-col overflow-x-clip overflow-y-auto bg-canvas"
        >
          {children}
          <ScrollReset />
        </div>
      </body>
    </html>
  );
}
