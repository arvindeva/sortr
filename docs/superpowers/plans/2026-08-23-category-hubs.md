# Category Hubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. (This run: executed inline by the session itself — user wants to eyeball and tune.)

**Goal:** 15 category landing pages at `/sorters/<slug>` wired into a breadcrumb link graph from ~14k sorter pages.

**Architecture:** Pure registry module (names/slugs/blurbs) → cached per-category queries beside the trending machinery → one force-dynamic hub route → sorter-header eyebrow becomes a hub link with BreadcrumbList schema → sitemap entries. No homepage/browse/footer changes (spec: rejected).

**Tech Stack:** Next 15 App Router, Drizzle, unstable_cache.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-23-category-hubs-design.md`.
- Hub route MUST be `export const dynamic = "force-dynamic"` — Railway private networking is runtime-only; a static route with DB queries kills the deploy build while passing locally (see memory: local-env-gotchas).
- All listing queries filter through `listableSorter()`.
- "Other", uncategorized, and unknown slugs → `notFound()`.
- Commit trailers: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` + `Claude-Session: https://claude.ai/code/session_01DdCBZcTX3KQtBGp9JgjtQd`.
- Gates: `npx tsc --noEmit` per task; full `npm run build` before final commit (stop dev server first — concurrent build corrupts `.next`; restart after).

---

### Task 1: Registry — `src/lib/categories.ts` (create)

- [ ] Pure module: `CATEGORY_HUBS: { name; slug; blurb }[]` for all 15 real categories (Movies & TV→`movies-tv`, Music→`music`, Video Games→`video-games`, Books→`books`, Food→`food`, Sports→`sports`, Fashion→`fashion`, Academics→`academics`, Anime & Manga→`anime-manga`, Tech→`tech`, Internet→`internet`, Travel→`travel`, Nature→`nature`, Hobbies→`hobbies`, Vehicles→`vehicles`). Blurbs: ~2 sentences each, fandom voice, natural vocabulary ("rank", "sorter", "head-to-head"), no stuffing.
- [ ] Helpers: `categoryBySlug(slug)`, `slugForCategory(name)` (both `undefined` for Other/unknown).
- [ ] `npx tsc --noEmit`.

### Task 2: Queries — `src/lib/category-sorters.ts` (create)

- [ ] `getTrendingInCategory(category, limit)` — 7-day plays, join like `trending-sorters.ts` (reuse its shape incl. `previewItemsSql`), `and(listableSorter(), eq(sorters.category, category))`, unstable_cache `["trending-in-category", category]`-style keys, revalidate 300.
- [ ] `getPopularInCategory(category, limit)` — all-time by `completionCount desc`, same shape/gates, revalidate 300.
- [ ] `getCategoryCount(category)` — count of listable sorters, revalidate 300.
- [ ] `npx tsc --noEmit`.

### Task 3: Hub route — `src/app/sorters/[category]/page.tsx` (create)

- [ ] `force-dynamic`. `categoryBySlug` → `notFound()` on miss.
- [ ] `generateMetadata`: title `` `${name} Sorters — Rank Your Favorites` ``, description from blurb + "head-to-head… pick a favorite, one matchup at a time", canonical `https://sortr.io/sorters/<slug>`.
- [ ] Body: breadcrumb line (Home › name) + BreadcrumbList JSON-LD; `ArcadePageHeader` (title = name, subtitle = live count "N sorters — pick one and start ranking"); blurb paragraph; "Trending this week" grid (≤10, `SorterCard`); "Popular all time" grid (≤10); create CTA block (reuse character-sorter page's pattern); `Browse all N →` link to `/browse?categories=<encoded name>`; "More categories" sibling chip row (14 links, chip styling per design system).
- [ ] Empty-category handling: if both grids empty, render blurb + CTA + browse link only (no empty grid headings).
- [ ] Verify on dev: `/sorters/video-games` 200 with sections; `/sorters/other` and `/sorters/nope` 404. `npx tsc --noEmit`.

### Task 4: Sorter pages join the tree

- [ ] `src/components/sorter-header-server.tsx`: the category eyebrow becomes `<Link href={/sorters/${slug}}>` when `slugForCategory(category)` resolves; plain text otherwise. Keep styling; add hover accent per chip conventions.
- [ ] `src/app/sorter/[slug]/page.tsx`: add BreadcrumbList JSON-LD (Home › category name+hub URL › sorter title) alongside the existing schema — only when the category maps to a hub.
- [ ] Verify: sorter page HTML contains hub href + BreadcrumbList. `npx tsc --noEmit`.

### Task 5: Sitemap + ship

- [ ] `src/app/sitemap.xml/route.ts`: 15 hub URLs, priority 0.7, changefreq daily (loop over `CATEGORY_HUBS`).
- [ ] Stop dev server → `npm run build` (expect hub route listed `ƒ`) → restart dev server.
- [ ] Commit (one commit per task or grouped sensibly), user eyeballs, deploy is user's.
