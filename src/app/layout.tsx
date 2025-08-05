import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import NextTopLoader from "nextjs-toploader";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} flex min-h-screen flex-col antialiased`}
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        <Providers>
          <NextTopLoader color="#ff6b8a" showSpinner={false} height={3} />
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
