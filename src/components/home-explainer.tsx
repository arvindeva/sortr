// The homepage's bottom explainer + FAQ. This is the page's indexable
// self-description — the copy deliberately carries the vocabulary that search
// engines and AI assistants retrieve by ("head-to-head", "pairwise
// comparison", "bias sorter", "character sorter", "tier list") while staying
// in product voice. The FAQ is mirrored into FAQPage JSON-LD so structured
// consumers get the same answers.

const FAQ: { q: string; a: string }[] = [
  {
    q: "How is a sorter different from a tier list maker like TierMaker?",
    a: "A tier list maker has you drag items into tiers by hand. In a sorter you only answer head-to-head matchups — the full ranking is computed from your picks, and every item gets an exact place instead of sharing a tier. If you like TierMaker but want a first-to-last order, that's what a sorter gives you.",
  },
  {
    q: "What is a bias sorter?",
    a: "The fandom name for this format: K-pop fans use bias sorters to rank a group's members, and anime fandoms know them as character sorters. On sortr you can make one for any group, ship list, discography, or anything else.",
  },
  {
    q: "How many matchups does it take?",
    a: "Far fewer than every possible pair. The sorting is smart, so 20 items take roughly 60 matchups instead of 190 — and calling a tie merges items and shortens the run further.",
  },
  {
    q: "Do I need an account?",
    a: "No — playing is free and anonymous. You only sign in to create sorters and save your rankings to a profile.",
  },
  {
    q: "What is a community ranking?",
    a: "Once at least 3 people finish the same sorter, their results combine into one consensus ranking, shown on the sorter's page.",
  },
  {
    q: "Can I keep a sorter private?",
    a: "Yes. A sorter can be public, unlisted (only people with the link can play), or private (only you). You pick when creating it and can change it any time.",
  },
];

export function HomeExplainer() {
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
    <section className="border-border w-full border-t pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <h2 className="display text-foreground text-2xl font-black md:text-3xl">
          What&apos;s a sorter?
        </h2>
        <p className="text-muted-foreground mt-3 text-[14px] leading-relaxed md:text-[15px]">
          A sorter is a head-to-head ranking tool: two items face off, you pick
          a side, and after enough matchups your full ranking emerges. It&apos;s
          pairwise comparison doing the work a tier list makes you do by hand —
          the head-to-head alternative to tier list makers like TierMaker.
          Fandoms know the format as a bias sorter or character sorter; it works
          just as well for albums, movies, games, or food. When enough people
          play the same sorter, their results combine into a community ranking.
          Free to play, no account needed — sign in when you want to create and
          save your own.
        </p>

        {/* Collapsed by default — crawlers index <details> content regardless,
          and the JSON-LD above carries the full answers either way. */}
        <div className="mt-6">
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
      </div>
    </section>
  );
}
