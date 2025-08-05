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
    images: [
      {
        url: "/og-browse.png",
        width: 1200,
        height: 630,
        alt: "Browse Sorters on sortr",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Sorters",
    description:
      "Explore and discover sorters across all categories. Search by title, creator, or browse by category.",
    images: ["/og-browse.png"],
  },
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
