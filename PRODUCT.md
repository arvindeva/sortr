# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally in design decisions:

- **Players** — fandom fans (K-pop, anime, games, Thai BL, TV, music) who open a sorter, rank it, and share the result. They are mostly young, mostly on phones, and typically arrive from a link someone shared on X or another network, often without an account.
- **Creators** — fans who build sorters for their fandom (characters, ships, albums, outfits, moments), maintain them as their fandom changes, and watch their sorter get played and ranked by the community.

## Product Purpose

sortr ranks anything by asking one question at a time: which of these two do you prefer? A full ranking falls out of the matchups, with ties allowed. Players get a personal ranking they can share; creators get a sorter the fandom plays; every sorter accumulates a community ranking from everyone's plays.

Success is the loop turning: a player finishes a sort, shares the result, someone new arrives through that share, plays, and some of them go on to create.

## Positioning

**Head-to-head sorting.** You never drag items onto a board or assign scores — you pick a favourite, one matchup at a time, and the ranking is computed from your choices (charasort-style, with ties). A tier-list tool cannot truthfully claim this mechanism.

## Operating Context

- Traffic is ~80% mobile; the phone is where most sorting happens.
- Growth arrives in fandom waves, overwhelmingly from X/Twitter (e.g. Stray Kids, Thai BL), followed by quieter stretches. Search brings a smaller, steadier stream, much of it people searching for "sortr" after seeing it shared.
- Players often come through in-app browsers (X, Instagram, Discord) and through incognito/private sessions.
- The product is run solo by one developer, so moderation and operations need to stay manageable for one person.

## Capabilities and Constraints

- **Play:** pairwise sorting with ties and undo; in-progress sorts resume in the same browser for everyone and across devices for signed-in users; results saved as permalinked rankings.
- **Share:** result pages and generated share images for posting elsewhere.
- **Create:** sorters with images, tags/filters, editing with versioning, and public / unlisted / private visibility.
- **Community ranking:** a consensus per sorter, unlocking at 3 voices. Each signed-in user, and each anonymous browser, counts once (their latest ranking); identical repeated anonymous submissions are collapsed.
- **Accounts:** Google sign-in and email magic links; an account is required to create and to save progress, never to play.
- **Moderation:** a published content policy (`/content-policy`), a report button on every sorter, and an admin review queue.
- **Stack:** Next.js (App Router) + Postgres (Drizzle) + Cloudflare R2 for images, deployed on Railway.
- **Decided not to build (for now):** likes, follows, and comments as an in-app social graph; remix/clone and partial rankings are parked.

## Brand Commitments

- Name: **sortr** (lowercase in prose; `SORTR` wordmark).
- Tagline: **"Everything's a versus."**
- Voice: product-first, not marketing. State what it does plainly and lean into game/VS language ("pick a side", "round 2/5", "ranking locked"). Honest about accounts: free to play anonymously; an account only to create and save.
- The visual identity ("VERSUS arcade") is specified in `CLAUDE.md`, with implementation notes in `docs/design-system.md`.

## Evidence on Hand

- Real usage data in production (Postgres) and analytics (Umami): sorters, rankings, community rankings, and traffic by source.
- Real user feedback and reports, received through the in-app feedback form and report queue.
- No testimonials, press coverage, or customer case studies exist; do not fabricate them.

## Product Principles

1. **Never gate playing.** Sorting stays free and requires no account. Sign-in is asked for only when someone wants to create or save.

## Open Decisions

- Monetization is undecided. Ads have been considered (only after moderation is solid, and never on the sorting flow or results page); creator-side premium is the preferred long-term direction.
