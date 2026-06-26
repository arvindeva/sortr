import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Space_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArcadeBackground } from "@/components/ui/arcade-background";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";

import "./globals.css";

// Display / headings / wordmark / numbers — condensed, loud, uppercase.
// Explicit fallback + adjustFontFallback:false stops next/font from trying to
// derive fallback metrics for this family (which it can't, and warns about).
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  display: "swap",
  weight: ["600", "700", "800", "900"],
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "Arial", "sans-serif"],
});

// HUD / labels / meta / counters — the scoreboard voice.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
  weight: ["400", "700"],
});

// Body / UI — clean geometric grotesk.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
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
        className={`${bigShoulders.variable} ${spaceMono.variable} ${spaceGrotesk.variable} flex min-h-screen flex-col antialiased`}
        style={{ fontFamily: "var(--font-space-grotesk)" }}
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
