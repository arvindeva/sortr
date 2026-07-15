import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArcadeBackground } from "@/components/ui/arcade-background";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";

import "./globals.css";

// Display / headings / wordmark / numbers — condensed, loud, uppercase.
// League Gothic ships a single weight; font-synthesis-weight:none (globals.css)
// keeps browsers from faking heavier ones. Explicit fallback +
// adjustFontFallback:false mirrors the previous setup (no derived metrics).
const leagueGothic = localFont({
  src: "./fonts/LeagueGothic-Regular.woff2",
  variable: "--font-league-gothic",
  display: "swap",
  weight: "400",
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "Arial", "sans-serif"],
});

// HUD / labels / meta / counters — the scoreboard voice.
const leagueMono = localFont({
  src: [
    { path: "./fonts/LeagueMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/LeagueMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-league-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

// Body / UI — variable 200–900.
const monaSans = localFont({
  src: "./fonts/MonaSansVF.woff2",
  variable: "--font-mona-sans",
  display: "swap",
  weight: "200 900",
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://sortr.io"),
  title: {
    template: "%s | sortr",
    default: "Sortr - Rank Anything",
  },
  keywords: [
    "ranking",
    "sorter",
    "list",
    "comparison",
    "polls",
    "tier list",
    "ranking tool",
    "vote",
    "survey",
  ],
  icons: {
    icon: [
      // SVG first — scales crisply; modern browsers prefer it.
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

// Browser chrome / address-bar color, matched to the active theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0918" },
    { media: "(prefers-color-scheme: light)", color: "#f4f2fb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${leagueGothic.variable} ${leagueMono.variable} ${monaSans.variable} flex min-h-screen flex-col antialiased`}
        style={{ fontFamily: "var(--font-mona-sans)" }}
      >
        {isProd &&
          process.env.NEXT_PUBLIC_UMAMI_URL &&
          process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
            <Script
              defer
              src={process.env.NEXT_PUBLIC_UMAMI_URL}
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              data-domains="sortr.io,www.sortr.io"
            />
          )}
        <Providers>
          <ArcadeBackground />
          <NextTopLoader color="#ff2e7e" showSpinner={false} height={3} />
          <Navbar />
          <div className="relative z-10 mb-12 flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
