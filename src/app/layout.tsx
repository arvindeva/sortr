import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://sortr.dev"),
  title: {
    template: "%s | sortr",
    default: "sortr - Create a Sorter for Anything",
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
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
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
        className={`${GeistSans.variable} flex min-h-screen flex-col antialiased`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
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
          <NextTopLoader color="#da1b61" showSpinner={false} height={3} />
          <Navbar />
          <div className="mb-12 flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
