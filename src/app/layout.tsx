import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
      <body className="min-h-full">
        {/* vaul scales this wrapper when the drawer opens (shouldScaleBackground);
            it needs its own background so it stays cream-on-canvas while the
            body behind it darkens. */}
        <div
          data-vaul-drawer-wrapper=""
          className="flex min-h-dvh flex-col bg-canvas"
        >
          {children}
        </div>
      </body>
    </html>
  );
}
