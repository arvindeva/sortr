# Private / Unlisted Sorters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sorters get a `visibility` level — `public` (today), `unlisted` (hidden from every listing, link works), `private` (owner-only) — enforced through one shared gate module.

**Architecture:** New `visibility` column on `sorters`, orthogonal to lifecycle `status`. A pure module `src/lib/sorter-visibility.ts` exports two Drizzle predicates (`listableSorter()`, `viewableSorter(viewerUserId)`); every surface switches to them. The sorter page is ISR-cached with no session, so private pages render a leak-free static shell whose client component fetches `/api/sorters/[slug]` — the session-aware API is the actual gate (the sort page already loads through the same API, so gating it gates play too).

**Tech Stack:** Next 15 App Router, Drizzle ORM, next-auth v4 (`getServerSession`), react-query, zod.

## Global Constraints

- Visibility values are exactly `"public" | "unlisted" | "private"`; default `"public"`.
- Spec: `docs/superpowers/specs/2026-08-22-private-unlisted-sorters-design.md`. Rankings pages are NOT touched.
- Migrations are raw SQL the user runs themselves (staging first, prod at deploy) — never run DDL from this repo.
- Every commit ends with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01DdCBZcTX3KQtBGp9JgjtQd`
- `npx tsc --noEmit` must pass before every commit; full `npm run build` before the final one.
- Local `.env` DATABASE_URL points at STAGING — safe for test scripts. Never write to prod.
- Design system: HUD labels use the `.hud` utility (Mona Sans, uppercase, letterspaced); chips are mono 13px, surface bg, border, hover → accent border+text.

---

### Task 1: Schema column + visibility gate module

**Files:**
- Modify: `src/db/schema.ts` (sorters table, after the `status` line ~73)
- Create: `src/lib/sorter-visibility.ts`
- Test: `.tmp-visibility-test.ts` (repo root, deleted after run)

**Interfaces:**
- Consumes: `sorters` table from `@/db/schema`.
- Produces: `VISIBILITIES` const array, `type SorterVisibility = "public" | "unlisted" | "private"`, `listableSorter(): SQL`, `viewableSorter(viewerUserId?: string | null): SQL`. All later tasks import from `@/lib/sorter-visibility`.

- [ ] **Step 1: Ask the user to run the migration on STAGING**

Print this SQL and wait for confirmation (the user runs prod at deploy time):

```sql
ALTER TABLE sorters ADD COLUMN visibility varchar(16) NOT NULL DEFAULT 'public';
```

Verification query (expect every row `public`):

```sql
SELECT visibility, count(*) FROM sorters GROUP BY visibility;
```

- [ ] **Step 2: Add the column to the Drizzle schema**

In `src/db/schema.ts`, directly below the `status` line in the `sorters` table:

```ts
  // public | unlisted | private — audience, orthogonal to lifecycle `status`
  visibility: varchar("visibility", { length: 16 }).default("public").notNull(),
```

- [ ] **Step 3: Create the gate module**

`src/lib/sorter-visibility.ts` (complete file):

```ts
import { and, eq, ne, or, type SQL } from "drizzle-orm";
import { sorters } from "@/db/schema";

/**
 * The one place visibility rules live. Surfaces never encode visibility
 * logic themselves — a future change (e.g. invites for private sorters)
 * edits only this module.
 */

export const VISIBILITIES = ["public", "unlisted", "private"] as const;
export type SorterVisibility = (typeof VISIBILITIES)[number];

/** Enumeration surfaces (browse, trending, homepage, sitemap, others'
 *  profiles, popular-API): public only. */
export function listableSorter(): SQL {
  return and(
    eq(sorters.deleted, false),
    eq(sorters.status, "active"),
    eq(sorters.visibility, "public"),
  )!;
}

/** Direct access (sorter API, results, community, sort submit): active, and
 *  not private unless the viewer owns it. */
export function viewableSorter(viewerUserId?: string | null): SQL {
  const notPrivate = ne(sorters.visibility, "private");
  return and(
    eq(sorters.deleted, false),
    eq(sorters.status, "active"),
    viewerUserId
      ? or(notPrivate, eq(sorters.userId, viewerUserId))!
      : notPrivate,
  )!;
}
```

- [ ] **Step 4: Write and run the staging round-trip test**

`.tmp-visibility-test.ts` in the repo root:

```ts
import { db } from "@/db";
import { sorters } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { listableSorter, viewableSorter } from "@/lib/sorter-visibility";

async function main() {
  const [oldStyle] = await db
    .select({ c: count() })
    .from(sorters)
    .where(and(eq(sorters.deleted, false), eq(sorters.status, "active")));
  const [listable] = await db.select({ c: count() }).from(sorters).where(listableSorter());
  const [anonViewable] = await db.select({ c: count() }).from(sorters).where(viewableSorter(null));
  // All rows default to public, so all three counts must match today.
  console.log({ oldStyle: oldStyle.c, listable: listable.c, anonViewable: anonViewable.c });
  if (oldStyle.c !== listable.c || oldStyle.c !== anonViewable.c) {
    throw new Error("count mismatch — predicates changed behavior for public rows");
  }
  console.log("ok");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run (esbuild bundle pattern — tsx cannot resolve the `@` alias):

```bash
npx esbuild .tmp-visibility-test.ts --bundle --platform=node --alias:@=./src \
  --loader:.css=empty --outfile=.tmp-visibility-test.cjs --log-level=error \
  && node --env-file=.env .tmp-visibility-test.cjs; rm -f .tmp-visibility-test.ts .tmp-visibility-test.cjs
```

Expected: three equal counts, then `ok`. (If `--env-file` fails because DATABASE_URL is quoted in .env, run with `DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '\"')" node .tmp-visibility-test.cjs`.)

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/db/schema.ts src/lib/sorter-visibility.ts
git commit -m "Visibility: schema column + shared gate predicates"
```

---

### Task 2: Listing surfaces switch to `listableSorter()`

**Files:**
- Modify: `src/lib/browse.ts` (~line 50), `src/lib/trending-sorters.ts` (~line 45), `src/app/page.tsx` (~lines 34 and 76), `src/app/sitemap.xml/route.ts` (~lines 23 and 43), `src/app/api/sorters/route.ts` (GET, ~line 623)

**Interfaces:**
- Consumes: `listableSorter()` from Task 1.
- Produces: nothing new — behavior-preserving for public sorters.

- [ ] **Step 1: Replace the repeated filter pair in each file**

In every location that currently has:

```ts
eq(sorters.deleted, false),
eq(sorters.status, "active"),
```

replace the pair with:

```ts
listableSorter(),
```

and add `import { listableSorter } from "@/lib/sorter-visibility";` to each file. Specifics:

- `src/lib/browse.ts`: `const conditions = [eq(sorters.deleted, false), eq(sorters.status, "active")];` becomes `const conditions = [listableSorter()];` (keep the array type inference happy — if TS complains about `SQL | undefined` pushes below, type it `const conditions: SQL[] = [listableSorter()];` with `import type { SQL } from "drizzle-orm";` and add `!` to the existing `or(...)` push if not already there).
- `src/app/page.tsx`: both `.where(and(eq(sorters.deleted, false), eq(sorters.status, "active")))` become `.where(listableSorter())`.
- `src/app/sitemap.xml/route.ts`: same replacement at both spots.
- `src/lib/trending-sorters.ts`: replace the two `eq(...)` lines inside the existing `and(...)` with `listableSorter()` (an `and()` nesting another `and()` is fine in Drizzle).
- `src/app/api/sorters/route.ts` GET (popular-sorters endpoint ~line 623): `.where(eq(sorters.deleted, false))` becomes `.where(listableSorter())` — this endpoint feeds a public homepage list, so also gaining the `status='active'` filter it always should have had.

Do NOT touch `src/lib/admin-stats.ts` in this task — admin counts intentionally include everything (visibility breakdown is Task 6).

- [ ] **Step 2: Verify against staging**

Start the dev server, then:

```bash
curl -s "http://localhost:3000/api/browse?query=" | head -c 300   # if browse has no API, load /browse in curl and grep a known public sorter title
curl -s http://localhost:3000/sitemap.xml | head -5
curl -s http://localhost:3000/api/sorters | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['popularSorters']), 'popular')"
```

Expected: same results as before the change (all rows are public). Then flip one staging test sorter (e.g. slug `666-d68v2`) with SQL the implementer runs against STAGING (this is the local DATABASE_URL, safe):

```sql
UPDATE sorters SET visibility = 'unlisted' WHERE slug = '666-d68v2';
```

Reload `/browse` and search its title — it must be absent. Flip it back to `public` afterwards (or leave unlisted for Task 4 verification and note it).

- [ ] **Step 3: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/browse.ts src/lib/trending-sorters.ts src/app/page.tsx src/app/sitemap.xml/route.ts src/app/api/sorters/route.ts
git commit -m "Listings: gate through listableSorter() (public only)"
```

---

### Task 3: Visibility in create + edit flows

**Files:**
- Modify: `src/lib/validations.ts` (`createSorterSchema`)
- Modify: `src/app/api/sorters/route.ts` (POST insert, ~line 99)
- Modify: `src/app/api/sorters/[slug]/finalize/route.ts` (metadata update, ~lines 123 and 134)
- Create: `src/components/ui/visibility-picker.tsx`
- Modify: `src/app/create/create-sorter-form-tags.tsx` (the live create form)
- Modify: `src/app/sorter/[slug]/edit/edit-sorter-form.tsx`

**Interfaces:**
- Consumes: `VISIBILITIES`, `SorterVisibility` from Task 1.
- Produces: `<VisibilityPicker value onChange />` component; create POST accepts optional `visibility`; finalize accepts optional `meta.visibility`. Task 4's revalidation relies on finalize's existing `revalidatePath` behavior.

- [ ] **Step 1: Extend validation schemas**

In `src/lib/validations.ts`, inside `createSorterSchema`'s object (top level, next to `title`):

```ts
    visibility: z.enum(["public", "unlisted", "private"]).optional(),
```

`.optional()`, NOT `.default("public")` — the same schema shape is reused for edits, and a default would silently clobber an existing value when the field is omitted (the status-clobber trap called out in the spec). Add the same line to `createSorterFormSchema` if the create form validates client-side against it.

- [ ] **Step 2: Persist on create**

In `src/app/api/sorters/route.ts` POST, in the `db.insert(sorters).values({...})` block (~line 99, where `title: validatedData.title` is set), add:

```ts
        visibility: validatedData.visibility ?? "public",
```

- [ ] **Step 3: Persist on edit (finalize)**

In `src/app/api/sorters/[slug]/finalize/route.ts`, the route builds a sorter update from `meta` (~lines 123 and 134, `title: meta.title || sorterRow.title`). In BOTH update objects add:

```ts
        visibility: meta.visibility ?? sorterRow.visibility,
```

and make sure the `sorterRow` select in this route includes `visibility: sorters.visibility` (add it if the select is explicit). If `meta` is zod-validated in this route, add the same `.optional()` enum line to that schema. The route already calls `revalidatePath` for the sorter page — confirm the call covers `/sorter/${slug}` (grep `revalidatePath` in the file); if it does not, add after the update:

```ts
    revalidatePath(`/sorter/${slug}`);
```

This is what makes public→private take effect immediately instead of after the 1h ISR window.

- [ ] **Step 4: Build the picker component**

`src/components/ui/visibility-picker.tsx` (complete file):

```tsx
"use client";

import { VISIBILITIES, type SorterVisibility } from "@/lib/sorter-visibility";

const COPY: Record<SorterVisibility, { label: string; hint: string }> = {
  public: { label: "Public", hint: "Shows in browse and search" },
  unlisted: { label: "Unlisted", hint: "Only people with the link" },
  private: { label: "Private", hint: "Only you" },
};

export function VisibilityPicker({
  value,
  onChange,
}: {
  value: SorterVisibility;
  onChange: (v: SorterVisibility) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Sorter visibility" className="flex flex-wrap gap-2">
      {VISIBILITIES.map((v) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              active
                ? "border-main/60 bg-main/10"
                : "border-border bg-card hover:border-main/40"
            }`}
          >
            <span className={`hud block text-xs ${active ? "text-main-ink" : "text-foreground"}`}>
              {COPY[v].label}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {COPY[v].hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Wire into both forms**

In `src/app/create/create-sorter-form-tags.tsx`: add `const [visibility, setVisibility] = useState<SorterVisibility>("public");`, render `<VisibilityPicker value={visibility} onChange={setVisibility} />` under a small `.hud` section label `VISIBILITY` (place it after the cover/description fields, before tags), and include `visibility` in the JSON body the form POSTs to `/api/sorters`.

In `src/app/sorter/[slug]/edit/edit-sorter-form.tsx`: initialize the state from the loaded sorter (`useState<SorterVisibility>((sorter.visibility as SorterVisibility) ?? "public")` — the edit page's sorter query must select `visibility`; add it in `src/app/sorter/[slug]/edit/page.tsx`'s select), render the same picker in the metadata section, and include `visibility` in the finalize `meta` payload.

- [ ] **Step 6: Verify by hand on the dev server**

Create a sorter with visibility `unlisted` → confirm in staging DB: `SELECT slug, visibility FROM sorters ORDER BY "createdAt" DESC LIMIT 1;`. Edit it to `private`, save, re-check. Edit only its title (leave picker untouched), save → visibility must still be `private` (no clobber).

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/validations.ts src/app/api/sorters/route.ts 'src/app/api/sorters/[slug]/finalize/route.ts' src/components/ui/visibility-picker.tsx src/app/create/create-sorter-form-tags.tsx 'src/app/sorter/[slug]/edit/edit-sorter-form.tsx' 'src/app/sorter/[slug]/edit/page.tsx'
git commit -m "Create/edit: visibility picker, persisted without clobbering"
```

---

### Task 4: Direct-access gating (page shell, API gate, submit gate, OG)

**Files:**
- Modify: `src/lib/sorter-data.ts` (metadata select + `SorterPayload`)
- Modify: `src/app/api/sorters/[slug]/route.ts` (GET)
- Modify: `src/app/sorter/[slug]/page.tsx` (generateMetadata + render fork)
- Create: `src/components/private-sorter-view.tsx`
- Modify: `src/components/sorter-page-client.tsx` (optional `hideCommunity` prop)
- Modify: `src/app/api/sorting-results/route.ts` (POST 403)
- Modify: `src/app/api/sorters/[slug]/results/route.ts`, `src/app/api/sorters/[slug]/community-ranking/route.ts`
- Modify: `src/app/sorter/[slug]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `SorterVisibility` from Task 1. (These routes check the already-fetched row's `visibility` directly rather than re-querying through `viewableSorter` — they need to distinguish owner from stranger after the fact.)
- Produces: `SorterPayload.sorter.visibility: string`; `<PrivateSorterView slug={string} />`; `SorterPageClient` accepts `hideCommunity?: boolean`.

- [ ] **Step 1: Surface visibility in the payload**

In `src/lib/sorter-data.ts`:
- `getDynamicSorterMetadata` select: add `visibility: sorters.visibility,` and pass it through the returned object (`visibility: metadata.visibility,`).
- Add `visibility: string;` to the `DynamicSorterMetadata` interface and to the sorter object inside `SorterPayload` (find both interfaces at the top of the file).
- The gate at `if (metadata.deleted || metadata.status !== "active")` stays EXACTLY as is — private sorters still return data here; callers decide.
- In the final merged payload, include `visibility: metadata.visibility` next to the other metadata fields.

- [ ] **Step 2: Gate the slug API (this also gates the sort page — it loads via this endpoint)**

In `src/app/api/sorters/[slug]/route.ts` GET, after `const data = await getSorterDataCached(slug);` and the null check:

```ts
    if (data.sorter.visibility === "private") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id || session.user.id !== data.sorter.user.id) {
        // Same body as a missing sorter — the API confirms nothing.
        return Response.json({ error: "Sorter not found" }, { status: 404 });
      }
    }
```

(`getServerSession`/`authOptions` are already imported in this file.)

- [ ] **Step 3: Fork the sorter page for private + noindex unlisted**

In `src/app/sorter/[slug]/page.tsx`:

`generateMetadata`: after fetching `data`, add before the normal return:

```ts
  if (data.sorter.visibility === "private") {
    return {
      title: "Private sorter | sortr",
      description: "This sorter is private.",
      robots: { index: false, follow: false },
    };
  }
```

and merge `robots: { index: false, follow: true },` into the returned metadata object when `data.sorter.visibility === "unlisted"`.

Page component: after `const data = await getSorterDataCached(slug);` + null check, add the fork BEFORE any content that uses sorter data:

```tsx
  if (data.sorter.visibility === "private") {
    // ISR page has no session — render a leak-free shell; the client
    // component fetches through the session-gated API.
    return <PrivateSorterView slug={slug} />;
  }
```

with `import { PrivateSorterView } from "@/components/private-sorter-view";`. The static HTML for a private sorter now contains no title, items, cover, or description.

- [ ] **Step 4: Build PrivateSorterView**

`src/components/private-sorter-view.tsx` (complete file):

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { SorterHeaderServer } from "@/components/sorter-header-server";
import { SorterPageClient } from "@/components/sorter-page-client";
import { SorterContentSkeleton } from "@/components/skeletons/sorter-content-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import type { SorterData } from "@/hooks/api/use-sorter";

/**
 * Client half of a private sorter page. The ISR-cached HTML is a bare shell;
 * this fetches /api/sorters/[slug], which 404s for everyone but the owner.
 */
export function PrivateSorterView({ slug }: { slug: string }) {
  const { data, isPending, isError } = useQuery<SorterData>({
    queryKey: ["sorter", slug],
    queryFn: async () => {
      const res = await fetch(`/api/sorters/${slug}`);
      if (!res.ok) throw new Error("private");
      return res.json();
    },
    retry: false,
  });

  if (isPending) {
    return (
      <PageContainer>
        <SorterContentSkeleton />
      </PageContainer>
    );
  }
  if (isError || !data) {
    return (
      <PageContainer>
        <EmptyState
          title="This sorter is private"
          description="Only its creator can view or play it."
        />
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      <SorterHeaderServer
        sorter={data.sorter}
        hasFilters={(data.tags?.length ?? 0) > 0}
        isOwner
      />
      <SorterPageClient slug={slug} isOwner initialData={data} hideCommunity />
    </PageContainer>
  );
}
```

Adjust the exact `SorterHeaderServer`/`SorterPageClient` props to match their current signatures (read both before writing; `SorterHeaderServer` is presentational — no server-only imports — so client rendering is safe). Match how `src/app/sorter/[slug]/page.tsx` composes them (it may wrap in different layout components — mirror it).

- [ ] **Step 5: `hideCommunity` on SorterPageClient**

In `src/components/sorter-page-client.tsx`: add `hideCommunity?: boolean;` to `SorterPageClientProps`, destructure it (default `false`), and wrap the entire community block (the `communityRankingPool < MIN_RANKINGS ? … : …` chain) in `{!hideCommunity && ( … )}`. Also skip the community `useQuery` fetch when hidden by adding `enabled: !hideCommunity` to its options.

- [ ] **Step 6: Gate submissions and the read APIs**

`src/app/api/sorting-results/route.ts` POST: the existing sorter select (~line 33) must include `visibility: sorters.visibility, userId: sorters.userId` (add whichever is missing). After it resolves:

```ts
    if (sorter.visibility === "private" && userId !== sorter.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
```

`src/app/api/sorters/[slug]/results/route.ts` and `src/app/api/sorters/[slug]/community-ranking/route.ts`: both select the sorter by slug near the top. Add `visibility: sorters.visibility, ownerUserId: sorters.userId` to those selects, then after the existing not-found checks:

```ts
    if (sorterRow.visibility === "private") {
      const session = await getServerSession(authOptions);
      if (session?.user?.id !== sorterRow.ownerUserId) {
        return NextResponse.json({ error: "Sorter not found" }, { status: 404 });
      }
    }
```

(add the `getServerSession`/`authOptions` imports where missing; keep each file's existing variable names).

- [ ] **Step 7: OG image goes generic for private**

In `src/app/sorter/[slug]/opengraph-image.tsx`, after the `if (!data) return renderGenericOgImage();` line:

```ts
    if (data.sorter.visibility === "private") return renderGenericOgImage();
```

Unlisted keeps the real card (Discord unfurls need it).

- [ ] **Step 8: Verify the whole gate on staging**

Set the test sorter private: `UPDATE sorters SET visibility = 'private' WHERE slug = '666-d68v2';` then, against the dev server:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/sorters/666-d68v2        # expect 404 (no cookie)
curl -s http://localhost:3000/sorter/666-d68v2 | grep -ci "666"                              # expect 0 — no title in static HTML
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/sorters/666-d68v2/results # expect 404
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/sorter/666-d68v2/opengraph-image" # expect 200 (generic card)
```

Then in a logged-in browser session as the owner: the sorter page shows full content after a skeleton beat, Play works end to end (the sort page loads through the gated API), and submitting a ranking succeeds. In a logged-out/incognito window: the page shows "This sorter is private". Set the sorter to `unlisted` and confirm: page renders fully for incognito, `<meta name="robots" content="noindex, follow"/>` present, absent from /browse.

- [ ] **Step 9: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/lib/sorter-data.ts 'src/app/api/sorters/[slug]/route.ts' 'src/app/sorter/[slug]/page.tsx' src/components/private-sorter-view.tsx src/components/sorter-page-client.tsx src/app/api/sorting-results/route.ts 'src/app/api/sorters/[slug]/results/route.ts' 'src/app/api/sorters/[slug]/community-ranking/route.ts' 'src/app/sorter/[slug]/opengraph-image.tsx'
git commit -m "Private sorters: leak-free page shell + session-gated APIs"
```

---

### Task 5: Owner's profile — badges + visibility filter

**Files:**
- Modify: `src/app/api/user/[username]/route.ts`
- Modify: `src/app/user/[username]/page.tsx` (the duplicated server query — BOTH paths must match, known gotcha)
- Modify: `src/components/ui/sorter-card.tsx` (badge)
- Modify: `src/components/user-profile-client.tsx` (filter dropdown)

**Interfaces:**
- Consumes: `listableSorter()`, `SorterVisibility` from Task 1.
- Produces: profile sorter objects gain `visibility?: string`; `SorterCard` accepts it; `UserProfileClient` receives `isOwner: boolean` (add to its props if not already there — check how the page passes ownership today and reuse it).

- [ ] **Step 1: Owner-aware queries, in BOTH data paths**

`src/app/api/user/[username]/route.ts`: add session detection at the top of GET:

```ts
    const session = await getServerSession(authOptions);
    const isOwner = !!session?.user?.id && session.user.id === userData.id;
```

(import `getServerSession` from `"next-auth"` and `authOptions` from `"@/lib/auth"` if missing). Then replace the sorter-list and sorter-count conditions

```ts
eq(sorters.deleted, false),
eq(sorters.status, "active"),
```

with:

```ts
...(isOwner
  ? [eq(sorters.deleted, false), eq(sorters.status, "active")]
  : [listableSorter()]),
```

and add `visibility: sorters.visibility,` to the sorter select. Include `isOwner` in the JSON response so the client can trust one source.

`src/app/user/[username]/page.tsx`: the page already has the session (~line 235). Apply the identical condition change and `visibility` select to the duplicated query (~lines 57 and 87) — this is the path that feeds react-query `initialData`; if only the API is patched the page shows stale filtering after hard refresh (this exact bug bit the profile-card fallbacks in August).

- [ ] **Step 2: Badge on SorterCard**

In `src/components/ui/sorter-card.tsx`: add `visibility?: string;` to the `sorter` prop interface. Inside the card's root element (it renders a square `CoverTile`-based tile — ensure the root has `relative` in its className), add as the last child:

```tsx
      {sorter.visibility && sorter.visibility !== "public" && (
        <span className="hud absolute top-2 right-2 z-10 rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
          {sorter.visibility}
        </span>
      )}
```

(`.hud` already uppercases; non-owners never receive non-public sorters, so the badge only ever renders for the owner.)

- [ ] **Step 3: Filter dropdown in the profile client**

In `src/components/user-profile-client.tsx`, in the sorters section (around the `{sorters.map((sorter) => (` at ~line 93):

```tsx
const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
const hasNonPublic = isOwner && sorters.some((s: any) => s.visibility && s.visibility !== "public");
const visibleSorters =
  visibilityFilter === "all"
    ? sorters
    : sorters.filter((s: any) => (s.visibility ?? "public") === visibilityFilter);
```

Render next to the section title, only when `hasNonPublic`, using the repo's existing `Select` primitive (same import/pattern as `browse-client.tsx`'s sort select):

```tsx
{hasNonPublic && (
  <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
    <SelectTrigger className="w-[140px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="public">Public</SelectItem>
      <SelectItem value="unlisted">Unlisted</SelectItem>
      <SelectItem value="private">Private</SelectItem>
    </SelectContent>
  </Select>
)}
```

and map over `visibleSorters` instead of `sorters`. `isOwner` must reach this component — check `UserProfileClientProps` and how the page instantiates it; the page knows ownership (session ~line 235), so pass it down if it isn't already.

- [ ] **Step 4: Verify on staging**

Logged in as the test account, own profile: private + unlisted sorters appear with badges; the dropdown filters; sorter count includes them. Incognito on the same profile: non-public sorters absent, no dropdown, count matches public only. Hard-refresh both (exercises the page's own query, not just the API).

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add 'src/app/api/user/[username]/route.ts' 'src/app/user/[username]/page.tsx' src/components/ui/sorter-card.tsx src/components/user-profile-client.tsx
git commit -m "Profile: owner sees non-public sorters with badges + filter"
```

---

### Task 6: Admin adoption line + full verification

**Files:**
- Modify: `src/lib/admin-stats.ts`
- Modify: the admin dashboard component that renders sorter stats (grep `admin` in `src/components/` — the section fed by `admin-stats.ts`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `visibilityBreakdown: { visibility: string; count: number }[]` on the admin stats payload.

- [ ] **Step 1: Breakdown query**

In `src/lib/admin-stats.ts`, alongside the existing sorter counts:

```ts
  const visibilityBreakdown = await db
    .select({ visibility: sorters.visibility, count: count() })
    .from(sorters)
    .where(and(eq(sorters.deleted, false), eq(sorters.status, "active")))
    .groupBy(sorters.visibility);
```

Add it to the returned stats object and its TypeScript type. In the admin component, render one muted line under the sorter totals, e.g. `12,340 public · 210 unlisted · 95 private` (omit zero buckets).

- [ ] **Step 2: Full build (required — many route files changed)**

```bash
npm run build
```

Expected: clean. This is the gate that catches route-level import mistakes tsc and dev mode miss.

- [ ] **Step 3: End-to-end walkthrough on staging**

With the dev server: create a fresh sorter as `private` from the create form → confirm absent from /browse and /api/sorters, page is a shell for incognito, owner plays it end to end, its ranking submits, profile shows it with badge + filter, admin dashboard shows the breakdown. Flip it `unlisted` from edit → incognito link works, still absent from listings. Flip `public` → appears in browse.

- [ ] **Step 4: Commit, then hand deployment to the user**

```bash
npx tsc --noEmit
git add src/lib/admin-stats.ts src/components/<admin component file>
git commit -m "Admin: sorter visibility adoption breakdown"
```

Remind the user: run the `ALTER TABLE` on PROD before (or with) the deploy — the code tolerates the column's absence nowhere.
