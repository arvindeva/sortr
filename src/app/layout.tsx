import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { ProgressProvider } from "@/components/progress-provider";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "sortr",
  description: "sort a list your way",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`} style={{ fontFamily: 'var(--font-dm-sans)' }}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
        <ProgressProvider />
      </body>
    </html>
  );
}
