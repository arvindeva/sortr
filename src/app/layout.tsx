import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProgressProvider } from "@/components/progress-provider";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://sortr.dev'),
  title: "sortr - Create and Share Ranked Lists",
  description: "Create and share ranked lists for anything through pairwise comparison. Build custom rankings, sort items by preference, and discover popular sorters across movies, music, games, and more.",
  keywords: ["ranking", "sorter", "list", "comparison", "polls", "tier list", "ranking tool", "vote", "survey"],
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
  openGraph: {
    title: "sortr - Create and Share Ranked Lists",
    description: "Create and share ranked lists for anything through pairwise comparison. Build custom rankings, sort items by preference, and discover popular sorters.",
    type: "website",
    siteName: "sortr",
    images: [
      {
        url: "/og-home.png", // We'll create this later
        width: 1200,
        height: 630,
        alt: "sortr - Create and share ranked lists",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "sortr - Create and Share Ranked Lists",
    description: "Create and share ranked lists for anything through pairwise comparison. Build custom rankings and discover popular sorters.",
    images: ["/og-home.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased flex flex-col min-h-screen`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Providers>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
        <ProgressProvider />
      </body>
    </html>
  );
}
