import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { ArcadePageHeader } from "@/components/ui/arcade-page-header";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { SorterCard } from "@/components/ui/sorter-card";
import { CATEGORY_HUBS, categoryBySlug, hubBlurb } from "@/lib/categories";
import {
  getCategoryCount,
  getPopularInCategory,
  getTrendingInCategory,
} from "@/lib/category-sorters";
import { Plus } from "lucide-react";

/**
 * /sorters/<category> — the category hub: a curated landing page (hubs are
 * for arriving; browse is for looking). Trending + popular in the category,
 * a blurb, and the full catalog one click away.
 */

interface HubPageProps {
  params: Promise<{ category: string }>;
}

// force-dynamic, NOT static/ISR: Railway private networking is runtime-only —
// a static route with DB queries dies during the deploy build while passing
// locally. Freshness comes from the 5-min unstable_cache on the queries.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: HubPageProps): Promise<Metadata> {
  const { category } = await params;
  const hub = categoryBySlug(category);
  if (!hub) return { title: "Not Found" };

  const title = `${hub.name} Sorters — Rank Your Favorites`;
  const description = `${hubBlurb(hub.name)} Free — no account needed to play.`;
  const url = `https://sortr.io/sorters/${hub.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "website", siteName: "sortr", url },
  };
}

export default async function CategoryHubPage({ params }: HubPageProps) {
  const { category } = await params;
  const hub = categoryBySlug(category);
  if (!hub) notFound();

  const [trending, popular, total] = await Promise.all([
    getTrendingInCategory(hub.name, 10),
    getPopularInCategory(hub.name, 10),
    getCategoryCount(hub.name),
  ]);

  // Popular repeats trending on small categories — drop dupes from Popular.
  const trendingIds = new Set(trending.map((s) => s.id));
  const popularUnique = popular.filter((s) => !trendingIds.has(s.id));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "sortr",
        item: "https://sortr.io",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: hub.name,
        item: `https://sortr.io/sorters/${hub.slug}`,
      },
    ],
  };

  const browseHref = `/browse?categories=${encodeURIComponent(hub.name)}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PageContainer className="flex flex-col gap-10 md:gap-12">
        <div>
          {/* Breadcrumb */}
          <nav className="hud mb-3 text-xs text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-main-ink">
              Home
            </Link>
            <span aria-hidden className="mx-1.5 text-muted-foreground/50">
              ›
            </span>
            <span className="text-foreground">{hub.name}</span>
          </nav>

          <ArcadePageHeader
            title={hub.name}
            subtitle={`${total.toLocaleString()} sorters — pick one and start ranking.`}
          />
          <p className="text-muted-foreground mt-5 max-w-3xl text-[14px] leading-relaxed md:text-[15px]">
            {hubBlurb(hub.name)}
          </p>
        </div>

        {trending.length > 0 && (
          <section className="w-full">
            <h2 className="display text-foreground mb-6 text-3xl font-black md:text-[42px]">
              Trending this week
            </h2>
            <SorterGrid>
              {trending.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          </section>
        )}

        {popularUnique.length > 0 && (
          <section className="w-full">
            <h2 className="display text-foreground mb-6 text-3xl font-black md:text-[42px]">
              Popular all time
            </h2>
            <SorterGrid>
              {popularUnique.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          </section>
        )}

        {/* Full catalog + create */}
        <section className="border-main/35 bg-main/5 rounded-2xl border p-6 md:p-8">
          <h2 className="display text-foreground text-2xl font-black md:text-3xl">
            Rank it your way
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-[14px] leading-relaxed">
            Browse everything the community has made, or create the{" "}
            {hub.name.toLowerCase()} sorter you wish existed. Playing is free —
            no account needed.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="neutral" arcade>
              <Link href={browseHref}>
                Browse all {total.toLocaleString()} →
              </Link>
            </Button>
            <Button asChild size="lg" arcade className="group">
              <Link href="/create">
                <Plus
                  className="transition-transform duration-200 group-hover:rotate-90"
                  size={18}
                />
                Create a sorter
              </Link>
            </Button>
          </div>
        </section>

        {/* Sibling hubs */}
        <section className="w-full">
          <div className="hud mb-3 text-xs text-muted-foreground">
            More categories
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_HUBS.filter((c) => c.slug !== hub.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/sorters/${c.slug}`}
                className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-[13px] text-muted-foreground transition-colors hover:border-main/40 hover:text-main-ink"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </PageContainer>
    </>
  );
}
