import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Content Policy",
  description:
    "What's allowed on sortr, what isn't, and how to report a sorter that crosses the line.",
  alternates: { canonical: "/content-policy" },
};

const LAST_UPDATED = "September 8, 2026";
const CONTACT = "privacy@sortr.io";

// A cyan→magenta inline link, matching the design.
function Inl({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="border-b border-cyan/40 text-cyan-ink transition-colors hover:border-main/50 hover:text-main-ink"
    >
      {children}
    </a>
  );
}

// Content blocks: a paragraph or a bullet list (same shapes as /privacy).
type Block =
  | { kind: "p"; content: React.ReactNode }
  | { kind: "list"; items: React.ReactNode[] };

interface Section {
  title: string;
  blocks: Block[];
}

const p = (content: React.ReactNode): Block => ({ kind: "p", content });
const list = (items: React.ReactNode[]): Block => ({ kind: "list", items });

const mail = <Inl href={`mailto:${CONTACT}`}>{CONTACT}</Inl>;

const SECTIONS: Section[] = [
  {
    title: "Not allowed",
    blocks: [
      p("These get removed, no matter how the sorter is framed:"),
      list([
        <>
          <strong className="text-foreground">
            Content that sexualizes minors
          </strong>{" "}
          — real or fictional. This includes sorters built around romantic or
          sexual pairings of child characters with adults.
        </>,
        <>
          <strong className="text-foreground">
            Sexual content about real people without their consent
          </strong>{" "}
          — sexualized sorters targeting real, identifiable people.
        </>,
        <>
          <strong className="text-foreground">Illegal content</strong> — and
          anything that exists to harass, threaten, or dehumanize a person or
          group.
        </>,
      ]),
      p(
        "Ranking characters, ships, albums, outfits, or anything else fandom is normally about — including villain ships and dark themes between adult characters — is what sortr is for. This policy is about the lines above, not about policing taste.",
      ),
    ],
  },
  {
    title: "Enforcement",
    blocks: [
      p(
        "We remove content that crosses these lines, and we may remove content at our discretion even when it isn't listed here. Repeatedly posting removed content gets the account removed too.",
      ),
      p(
        "Removals preserve the record: rankings people already made keep working, and nothing is silently rewritten.",
      ),
    ],
  },
  {
    title: "Reporting",
    blocks: [
      p(
        "Every sorter page has a “Report this sorter” link at the bottom. Use it — reports go straight to a queue we review. Leaving an email is optional; the removal itself is the reply.",
      ),
      p(<>You can also reach us at {mail}.</>),
    ],
  },
];

export default function ContentPolicyPage() {
  return (
    <main className="relative z-10 mx-auto max-w-[760px] px-6 pt-16 pb-8 md:px-8">
      {/* Header */}
      <div className="hud mb-3.5 text-xs text-secondary-foreground/60">
        Last updated · {LAST_UPDATED}
      </div>
      <h1 className="display text-[clamp(2.75rem,8vw,3.5rem)] font-black text-foreground">
        Content Policy
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">
        Sortr is for ranking the things fandom cares about. Almost everything is
        fair game — this page covers the few things that aren&apos;t, in plain
        language.
      </p>

      <div className="my-10 h-px bg-border" />

      {/* Sections */}
      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-9">
          <h2 className="display mb-3.5 text-[26px] leading-tight font-extrabold text-foreground">
            {section.title}
          </h2>
          {section.blocks.map((block, i) => {
            if (block.kind === "p") {
              return (
                <p
                  key={i}
                  className="mb-3.5 text-base leading-relaxed text-muted-foreground"
                >
                  {block.content}
                </p>
              );
            }
            return (
              <ul key={i} className="mb-3.5 flex list-none flex-col gap-2.5 p-0">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className="shrink-0 leading-relaxed text-main">·</span>
                    <span className="leading-relaxed text-muted-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            );
          })}
        </section>
      ))}

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/"
          className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-main-ink"
        >
          ← back to home
        </Link>
      </div>
    </main>
  );
}
