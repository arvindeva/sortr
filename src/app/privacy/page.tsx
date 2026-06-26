import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How sortr handles your data: anonymous by default, cookieless analytics, and only the email you give us if you create an account.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "June 26, 2026";
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

// Content blocks: a paragraph, an uppercase mono sub-heading, or a bullet list.
type Block =
  | { kind: "p"; content: React.ReactNode }
  | { kind: "sub"; content: React.ReactNode }
  | { kind: "list"; items: React.ReactNode[] };

interface Section {
  title: string;
  blocks: Block[];
}

const p = (content: React.ReactNode): Block => ({ kind: "p", content });
const sub = (content: React.ReactNode): Block => ({ kind: "sub", content });
const list = (items: React.ReactNode[]): Block => ({ kind: "list", items });

const mail = <Inl href={`mailto:${CONTACT}`}>{CONTACT}</Inl>;

const SECTIONS: Section[] = [
  {
    title: "Who we are",
    blocks: [
      p(
        <>
          Sortr is operated by the Sortr team. If you have any questions about
          this policy or your data, contact us at {mail}.
        </>,
      ),
    ],
  },
  {
    title: "What we collect, and why",
    blocks: [
      sub("If you use sortr without an account"),
      p("You can browse sorters and complete rankings without signing up. In this case:"),
      list([
        "We do not collect any personal information about you.",
        "Your in-progress and completed rankings are stored locally in your own browser, so you can take a break and continue later. This data stays on your device and is associated only with that device.",
        "When you submit a completed ranking, it is saved to our database without any personal identifier — it is recorded as anonymous.",
      ]),
      sub("If you create an account"),
      p('Accounts on sortr use a "magic link" — there are no passwords. To create an account or sign in, we collect:'),
      list([
        "Your email address, which we use only to send you the sign-in link and to identify your account. We do not send marketing emails.",
        "A username, which is shown publicly on your profile and on rankings or sorters you create.",
        "A profile picture, if you choose to upload one.",
      ]),
      p("When you create sorters or save rankings while signed in, those are associated with your account and may be shown publicly (for example, on your profile or on the sorter’s page)."),
      sub("Content you create"),
      p("Sorters you create — including titles, descriptions, item names, and any images you upload — are stored on our systems and are publicly visible. Please don’t include private or sensitive information in content you create."),
    ],
  },
  {
    title: "User-generated content",
    blocks: [
      p("Sorters and rankings on sortr are created by users, not by us. We do not review or moderate this content before it is published, and we are not responsible for it."),
      p(
        <>
          If you come across content that is illegal, abusive, or violates
          someone’s rights, please report it to us at {mail} and we will review
          it. We may remove content at our discretion.
        </>,
      ),
    ],
  },
  {
    title: "Cookies and local storage",
    blocks: [
      p("We keep this minimal. Sortr does not use advertising or tracking cookies."),
      list([
        "Sign-in cookie (only if you have an account): when you sign in, we store a cookie that keeps you logged in. This is strictly necessary for accounts to work — without it, we couldn’t keep you signed in.",
        "Local storage: we use your browser’s local storage to remember your in-progress sorting sessions and your light/dark theme preference. This information stays on your device and is not sent to us.",
      ]),
      p("Because we don’t use tracking or advertising cookies, we don’t show a cookie-consent banner."),
    ],
  },
  {
    title: "Analytics",
    blocks: [
      p("We use Umami, a privacy-focused analytics tool, to understand how the site is used (for example, how many people visit and which pages are popular). Umami:"),
      list([
        "Does not use cookies.",
        "Does not collect personal information and does not track you across other websites.",
        "Records anonymized, aggregated usage data only.",
      ]),
    ],
  },
  {
    title: "How your information is stored and handled",
    blocks: [
      list([
        "Your data is stored on our hosting and database providers’ servers. We currently use Railway for hosting and our database, and Cloudflare R2 for image storage. These providers process data on our behalf.",
        "We use a third-party email service to send sign-in links, and Cloudflare Email Routing to receive email sent to our addresses.",
        "We do not sell your personal information, and we do not share it with advertisers.",
      ]),
    ],
  },
  {
    title: "Your choices and rights",
    blocks: [
      list([
        "Use anonymously: you can use most of sortr without an account and without giving us any personal information.",
        <>
          Access or delete your data: you can delete sorters and rankings you’ve
          created. If you’d like your account and associated personal data
          deleted, contact us at {mail} and we’ll take care of it.
        </>,
        "Clear local data: you can clear your in-progress rankings and preferences at any time by clearing your browser’s storage for this site.",
      ]),
      p(
        <>
          Depending on where you live (for example, the EU/UK under GDPR, or
          California under CCPA), you may have additional rights to access,
          correct, or delete your personal data. To exercise any of these, email
          us at {mail}.
        </>,
      ),
    ],
  },
  {
    title: "Children",
    blocks: [
      p("Sortr is not intended for children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we’ll remove it."),
    ],
  },
  {
    title: "Changes to this policy",
    blocks: [
      p('We may update this policy from time to time. When we do, we’ll update the "Last updated" date at the top. If we make significant changes (for example, if we begin showing ads), we’ll make that clear.'),
    ],
  },
  {
    title: "Contact",
    blocks: [
      p(
        <>
          Questions about this policy or your data? Email us at {mail}.
        </>,
      ),
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="relative z-10 mx-auto max-w-[760px] px-6 pt-16 pb-8 md:px-8">
      {/* Header */}
      <div className="hud mb-3.5 text-xs text-secondary-foreground/60">
        Last updated · {LAST_UPDATED}
      </div>
      <h1 className="display text-[clamp(2.75rem,8vw,3.5rem)] font-black text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">
        Sortr (&quot;we,&quot; &quot;us,&quot; or &quot;the site&quot;) lets you
        rank anything by making a series of head-to-head choices, and share the
        results. This explains what we collect, why, and what we do with it — in
        plain language.
      </p>
      <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
        The short version: you can use sortr anonymously without an account, we
        use privacy-friendly analytics that don&apos;t track you, and we only
        collect personal information (your email) if you choose to create an
        account.
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
            if (block.kind === "sub") {
              return (
                <h3
                  key={i}
                  className="mt-1.5 mb-3 font-mono text-[13px] font-bold tracking-wide text-foreground/80 uppercase"
                >
                  {block.content}
                </h3>
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
