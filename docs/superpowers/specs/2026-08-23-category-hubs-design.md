# Category hubs — design

**Date:** 2026-08-23
**Status:** approved (brainstorm session)

## Why

SEO/AEO follow-up to the discovery arc: "Anime & Manga" exists only as a
browse query param, invisible to crawlers as a page. Hubs give each real
category a landing page for mid-tail queries ("anime sorter", "video game
character sorter") and — via breadcrumbs — turn ~14k sorter pages into
internal links feeding 15 hubs, fixing the site's flat link graph.

## Decisions (user-approved)

- **URL:** `/sorters/<category-slug>` (e.g. `/sorters/video-games`).
- **15 hubs** — every real category; "Other" and uncategorized get none
  (junk drawer; unknown slugs and `other` 404).
- **Hubs are for arriving; browse is for looking.** Hub = curated landing
  (trending + popular in category, blurb, CTA) with the full catalog one
  click away ("Browse all N →" to filtered browse). Browse UX unchanged.
- **NO homepage shelves** (resolved: rejected). Top categories already
  dominate Hot/Trending — shelves would re-bucket the same sorters. The
  homepage stays activity-first.
- **NO footer link farm.** Link paths: sorter-page breadcrumbs (the bulk),
  sitemap, and a "More categories" sibling-chip row on each hub.
- **Sorter pages join the tree:** the category eyebrow above the title
  becomes a link to its hub (plain text when category is Other/none), plus
  BreadcrumbList JSON-LD (Home › Category › Sorter).

## Components

1. **`src/lib/categories.ts`** (pure): the 15 categories with display name,
   slug, and a hand-written ~2-sentence blurb each (fandom voice, carrying
   retrieval vocabulary naturally — no keyword stuffing). Helpers:
   `categoryBySlug()`, `slugForCategory()`. Single source of truth.
2. **Per-category queries** (alongside the trending machinery):
   trending-in-category (7d plays) and popular-in-category (all-time
   completionCount), both `listableSorter()`-gated, unstable_cache ~5 min,
   card-shaped payloads (previewItems included).
3. **Hub route `src/app/sorters/[category]/page.tsx`** — **force-dynamic**
   (Railway private networking is runtime-only; static routes with DB
   queries kill the build — see local-env-gotchas). Content: breadcrumb
   (Home › Category) + BreadcrumbList JSON-LD; ArcadePageHeader with live
   sorter count; blurb; Trending this week (≤10); Popular all-time (≤10);
   create CTA; "Browse all N →" to `/browse?categories=<name>`; sibling
   category chips. Metadata: "«Name» Sorters — …" title, vocabulary
   description, canonical.
4. **Sorter header:** category eyebrow → `<Link>` to hub;
   BreadcrumbList JSON-LD added on the sorter page.
5. **Sitemap:** 15 hub URLs, priority 0.7.

## Constraints

- Images in cards: card components already handle covers; item-image
  lessons apply (never the 64px thumbnails at tile size).
- `npx tsc --noEmit` + full local `npm run build` before ship.
- All queries through `listableSorter()`.

## Out of scope

Homepage changes; browse changes; footer changes; per-category FAQ.
