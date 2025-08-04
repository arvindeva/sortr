import type { Metadata } from "next";
import { Box } from "@/components/ui/box";
import { HomepageClient } from "@/components/homepage-client";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const title = "sortr - Create a Sorter for Anything";
  const description =
    "Create and share a sorter for anything to rank items from best to worst.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "sortr",
      images: [
        {
          url: "/og-home.png",
          width: 1200,
          height: 630,
          alt: "sortr - Create and share a sorter for anything",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-home.png"],
    },
  };
}

export default function Home() {
  // JSON-LD structured data for homepage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "sortr",
    description:
      "Create and share a sorter for anything to rank items from best to worst",
    url: process.env.NEXTAUTH_URL || "https://sortr.dev",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXTAUTH_URL || "https://sortr.dev"}/browse?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-2 py-10 md:px-4">
        <section className="mx-auto mb-10 flex max-w-xl justify-center">
          <Box variant="primary" size="sm" className="text-center md:p-8">
            <h1 className="text-4xl font-extrabold tracking-wide md:mb-4 md:text-7xl">
              sortr
            </h1>
            <p className="mb-2 text-lg font-bold md:mb-4 md:text-xl">
              Create a Sorter for Anything
            </p>
            <p className="font-medium md:text-lg">
              Inspired by{" "}
              <Link
                href={`https://execfera.github.io/charasort/`}
                target="_blank"
                className="text-blue-800 underline dark:text-blue-800"
              >
                charasort
              </Link>
              .
            </p>
          </Box>
        </section>
        
        {/* Client-side fetched popular sorters */}
        <HomepageClient />
      </main>
    </>
  );
}