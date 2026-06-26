import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Sorters",
  description:
    "Explore and discover sorters across all categories. Search by title, creator, or browse by category. Create and share a sorter for anything to rank items from best to worst.",
  openGraph: {
    title: "Browse Sorters",
    description:
      "Explore and discover sorters across all categories. Search by title, creator, or browse by category.",
    type: "website",
    siteName: "sortr",
    // OG image falls back to the generic app/opengraph-image.tsx for now.
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Sorters",
    description:
      "Explore and discover sorters across all categories. Search by title, creator, or browse by category.",
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
