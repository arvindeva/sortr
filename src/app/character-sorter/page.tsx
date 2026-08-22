import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { ArcadePageHeader } from "@/components/ui/arcade-page-header";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { SorterCard } from "@/components/ui/sorter-card";
import { getTrendingSorters } from "@/lib/trending-sorters";
import { Plus } from "lucide-react";

/**
 * /character-sorter — the canonical landing page for the term the fandom
 * community already uses when sharing sortr links. A real page, not an SEO
 * doorway: it explains the format, embeds live trending character sorters to
 * play immediately, and carries its own FAQ + FAQPage JSON-LD. Linked from
 * the footer and listed in the sitemap.
 */

// Character-heavy categories; the live grid prefers these, topping up from
// the general trending list if they run thin.
const CHARACTER_CATEGORIES = new Set([
  "Anime & Manga",
  "Video Games",
  "Movies & TV",
]);

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a character sorter?",
    a: "A ranking game for fandom characters: you answer head-to-head matchups — this one or that one? — until every character has a place. No tiers, no dragging; your choices build the list.",
  },
  {
    q: "Can I use character images?",
    a: "Yes — upload art for each character when creating a sorter, and it shows in every matchup and on your final ranking's share card.",
  },
  {
    q: "How is it different from a tier list?",
    a: "A tier list groups characters into bands you arrange yourself. A sorter gives every character an exact rank computed from your picks — and characters you genuinely can't choose between can be tied to share a place.",
  },
  {
    q: "Is it free?",
    a: "Completely. Play any sorter without an account; sign in only to create your own or save your rankings to a profile.",
  },
];

export const metadata: Metadata = {
  title: "Character Sorter — Rank Your Favorite Characters",
  description:
    "Play a character sorter: rank anime, game, and idol characters head-to-head — pick a favorite, one matchup at a time, and get your full ranking from #1 down. Free, no account needed.",
  alternates: { canonical: "https://sortr.io/character-sorter" },
  openGraph: {
    title: "Character Sorter — Rank Your Favorite Characters",
    description:
      "Rank every character in your fandom head-to-head, one matchup at a time.",
    type: "website",
    siteName: "sortr",
    url: "https://sortr.io/character-sorter",
  },
};

export const revalidate = 1800;

const STEPS: { title: string; body: string }[] = [
  {
    title: "Pick a side",
    body: "Two characters face off — tap the one you like more. Genuinely can't choose? Call a tie and they'll share a rank.",
  },
  {
    title: "Keep going",
    body: "The matchups keep coming. The sorting is smart, so ranking 20 characters takes roughly 60 matchups — not the 190 of every possible pair.",
  },
  {
    title: "Get your ranking",
    body: "Your full list from #1 down, plus a share card made for the group chat. When 3 or more people play the same sorter, its community ranking unlocks.",
  },
];

export default async function CharacterSorterPage() {
  // Live content: trending sorters, preferring character-heavy categories.
  const trending = await getTrendingSorters(30);
  const preferred = trending.filter(
    (s) => s.category && CHARACTER_CATEGORIES.has(s.category),
  );
  const rest = trending.filter(
    (s) => !s.category || !CHARACTER_CATEGORIES.has(s.category),
  );
  const live = [...preferred, ...rest].slice(0, 10);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageContainer className="flex flex-col gap-10 md:gap-12">
        <div>
          <ArcadePageHeader
            title="Character sorter"
            subtitle="Rank every character in your fandom — one matchup at a time."
          />
          <p className="text-muted-foreground mt-5 max-w-3xl text-[14px] leading-relaxed md:text-[15px]">
            A character sorter ranks your favorites by playing: two characters
            appear, you pick the one you like more, and after enough matchups
            your full list emerges — #1 to the very bottom, decided by your own
            choices instead of dragging cards into tiers. Fandoms have passed
            hand-made sorters around for years (the charasort tradition sortr
            is openly inspired by); sortr is that format with images, ties,
            share cards, and community rankings built in.
          </p>
        </div>

        {live.length > 0 ? (
          <section className="w-full">
            <h2 className="display mb-6 text-3xl font-black text-foreground md:text-[42px]">
              Play one now
            </h2>
            <SorterGrid>
              {live.map((sorter) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          </section>
        ) : (
          <p className="text-muted-foreground text-[14px]">
            Looking for something to rank?{" "}
            <Link href="/browse" className="text-cyan-ink underline">
              Browse all sorters →
            </Link>
          </p>
        )}

        {/* How it works */}
        <section className="w-full">
          <h2 className="display mb-6 text-3xl font-black text-foreground md:text-[42px]">
            How it works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="hud text-main-ink text-xs">0{i + 1}</div>
                <h3 className="display mt-2 text-xl font-black text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Create CTA */}
        <section className="rounded-2xl border border-main/35 bg-main/5 p-6 md:p-8">
          <h2 className="display text-2xl font-black text-foreground md:text-3xl">
            Make one for your fandom
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-[14px] leading-relaxed">
            Every anime, game, group, and show deserves a definitive ranking.
            Creating a sorter takes an account — playing never does.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" arcade className="group">
              <Link href="/create">
                <Plus
                  className="transition-transform duration-200 group-hover:rotate-90"
                  size={18}
                />
                Create a sorter
              </Link>
            </Button>
            <Button asChild size="lg" variant="neutral" arcade>
              <Link href="/browse">Browse sorters</Link>
            </Button>
          </div>
        </section>

        {/* FAQ */}
        <section className="w-full">
          <h2 className="display text-2xl font-black text-foreground md:text-3xl">
            Questions
          </h2>
          <div className="mt-4 max-w-3xl">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group border-border border-b">
                <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden
                    className="text-muted-foreground shrink-0 transition-transform duration-150 group-open:rotate-90"
                  >
                    ▸
                  </span>
                </summary>
                <p className="text-muted-foreground pb-4 text-[13px] leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </PageContainer>
    </>
  );
}
