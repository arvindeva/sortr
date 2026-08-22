# Private / unlisted sorters — design

**Date:** 2026-08-22
**Status:** approved (brainstorm session)

## Why

Three independent feedback asks (Jul 10, Jul 18, Aug 2 2026), all the same
shape: "I want to make sorters just for personal use" / "don't want other
people to use their sorters" / "single-use sorters… or just an option to make
it private." Nobody asked for permissions systems — they want their sorters
out of public view.

Also a prerequisite for remix/clone (parked): remixes need a
draft → unlisted → public path or they flood browse.

## Decisions (user-approved)

- **Three levels: `public` / `unlisted` / `private`.** Public = today.
  Unlisted = hidden from every listing, link works for everyone. Private =
  owner-only.
- **Existing rankings stay viewable** when a sorter leaves public. A ranking
  is the ranker's artifact (matches the deleted-sorter precedent). No
  redaction, no hiding.
- **Free and unlimited.** No caps, no Pro gating. Admin dashboard tracks
  adoption so a future gating decision would be data-driven.
- **Picker at create + edit, default public.** Three-option control in both
  forms; the growth flywheel stays the default path.

## Data model

New column on `sorters`, orthogonal to lifecycle `status`
(draft / active / archived):

```sql
ALTER TABLE sorters
  ADD COLUMN visibility varchar(16) NOT NULL DEFAULT 'public';
```

Values: `public` | `unlisted` | `private`. No backfill needed (default covers
history). `status` keeps meaning lifecycle; `visibility` means audience. We
rejected extending the `status` enum because the edit/publish flow sets
`status='active'` and would silently clobber visibility, and an archived
private sorter would be unrepresentable.

## Enforcement: one gate module

Today ~9 files each repeat `deleted = false AND status = 'active'`. New
module `src/lib/sorter-visibility.ts` exports two Drizzle predicates, and all
surfaces switch to them:

- **`listableSorter`** — `deleted = false AND status = 'active' AND
  visibility = 'public'`. For every enumeration surface.
- **`viewableSorter(userId?)`** — `deleted = false AND status = 'active' AND
  (visibility != 'private' OR userId = owner)`. For every direct-access
  surface.

This is the module a future change (e.g. invites) edits — surfaces never
encode visibility logic themselves.

## Per-surface behavior

| Surface | Files | Behavior |
| --- | --- | --- |
| Browse / search | `src/lib/browse.ts`, `/api/sorters` | `listableSorter` — public only |
| Trending | `src/lib/trending-sorters.ts` | public only |
| Homepage | `src/app/page.tsx` | public only |
| Sitemap | `src/app/sitemap.xml/route.ts` | public only (already excludes non-active) |
| Profile, someone else viewing | `/api/user/[username]/route.ts` **and** the duplicated server query in `src/app/user/[username]/page.tsx` (react-query initialData — patch BOTH, known gotcha) | public only |
| Profile, owner viewing own | same files | all visibilities, with a HUD-style `UNLISTED` / `PRIVATE` badge on non-public cards, plus a visibility filter (All / Public / Unlisted / Private, default All) above the list — client-side, since the owner's list already loads fully; the APIs just include each sorter's `visibility` |
| Sorter page | `src/lib/sorter-data.ts`, `src/app/sorter/[slug]/page.tsx` | `viewableSorter(session user)`. Non-owner on private → a dedicated "This sorter is private" empty state (NOT a bare `notFound()` — the slug already contains the title, so a 404 hides nothing and is just unhelpful). Unlisted renders normally for everyone |
| Sorter OG image | `src/app/sorter/[slug]/opengraph-image.tsx` | private → generic card (crawlers/embeds leak nothing); unlisted → real card (Discord sharing needs it) |
| Sorter SEO meta | sorter page `generateMetadata` | `robots: noindex` when visibility ≠ public |
| Sort flow + submit | sort page, `POST /api/sorting-results` | playable iff viewable; the API also rejects non-owner submissions to private sorters (defense in depth — don't trust the page gate) |
| Results / community APIs | `/api/sorters/[slug]/results`, `/community-ranking` | gated by `viewableSorter` before returning (community payload is cached via `unstable_cache` — gate at the route, not inside the cache) |
| Community section | `sorter-page-client.tsx` + server props | hidden entirely for private sorters (a consensus of one is meaningless; also avoids the contradictory "share this sorter to get there" copy). Unlisted: normal — friends can reach the unlock of 3 |
| Ranking pages | `src/app/rankings/[id]/*` | **untouched.** Play CTA keeps linking to the sorter page, which gates. (These pages are statically cached with no user context, so a conditional disabled state isn't possible; the deleted-sorter disabled button works only because deletion is permanent.) |
| Admin dashboard | `src/lib/admin-stats.ts` | add a one-line count by visibility (adoption tracking) |

## Transitions

Visibility is editable any time from the edit form (and create form sets it
at birth). Consequences are all read-time — no cascades:

- Public → unlisted/private: drops out of listings on next query; trending /
  community caches lag up to their TTL (≤ 1h), acceptable.
- Private → public: appears everywhere again. Rankings made while private
  (owner's own) were never hidden, so nothing to un-hide.
- Edit-form saves must not clobber visibility unless the field is present in
  the payload (same class of bug as the status-clobber risk that killed
  Approach B).

## UI

- **Create + edit forms:** a three-option chip/segment control (Public /
  Unlisted / Private) with one-line descriptions, arcade-chip styling per the
  design system, default Public. Validated server-side against the enum.
- **Owner's profile cards + own sorter page header:** small HUD label
  (`UNLISTED` / `PRIVATE`) so owners always know a sorter's state.
- **Owner's profile sorter list:** visibility filter dropdown (All / Public /
  Unlisted / Private, default All), shown only to the owner viewing their own
  profile. Filters the already-loaded list client-side; hidden when every
  sorter is public (nothing to filter).

## Out of scope (explicitly)

- **Invites for private sorters.** User: not now, but keep possible. The
  model already supports it: visibility stays `private`; a future
  `sorter_invites` table (or signed link tokens) extends only
  `viewableSorter(userId)` from "owner only" to "owner or invited". No
  surface code or data migration would change.
- Per-item or per-ranking privacy; password protection; org/team sharing.
- Any caps or Pro gating.

## Testing

- Fixture sorter in each visibility, checked as anon / other-user / owner
  across: browse API, profile API (both code paths), sorter page, results
  API, community API, sorting-results POST, OG route, sitemap output.
- Transition test: public sorter with rankings → private → other-user link
  behavior, ranking page still renders, owner still plays.
- Edit-form save without touching visibility → visibility unchanged.
