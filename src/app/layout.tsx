import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";

import "./globals.css";

// Display / headings / wordmark / numbers — squared, loud, condensed.
// Anybody is variable on BOTH axes: weight 100–900 and width 50–150%. The
// font-stretch declaration exposes the width axis; the site's condensed look
// comes from `font-stretch: 75%` on html (globals.css). Explicit fallback +
// adjustFontFallback:false mirrors the previous setup (no derived metrics).
const anybody = localFont({
  src: "./fonts/AnybodyVF.woff2",
  variable: "--font-anybody",
  display: "swap",
  weight: "100 900",
  declarations: [{ prop: "font-stretch", value: "50% 150%" }],
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Helvetica Neue", "Arial", "sans-serif"],
});

// Body / UI — variable 200–900. Also drives the HUD/meta text (the .hud
// utility) now that the monospace face is retired from the UI.
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
        className={`${anybody.variable} ${monaSans.variable} flex min-h-screen flex-col antialiased`}
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
          <NextTopLoader color="#ff2e7e" showSpinner={false} height={3} />
          <Navbar />
          <div className="relative z-10 mb-12 flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
