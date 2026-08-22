import { and, eq, isNull, ne, or, type SQL } from "drizzle-orm";
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
  // Falsy viewerUserId (undefined/null/"") deliberately takes the anonymous
  // branch: userId is a NOT NULL uuid column, so "" could never match an
  // owner anyway — treat any non-id as "not signed in".
  const notPrivate = ne(sorters.visibility, "private");
  return and(
    eq(sorters.deleted, false),
    eq(sorters.status, "active"),
    viewerUserId
      ? or(notPrivate, eq(sorters.userId, viewerUserId))!
      : notPrivate,
  )!;
}

/** Visitor-facing ranking history (someone browsing another user's profile):
 *  keep rows whose sorter is gone (hard- or soft-deleted — old rankings keep
 *  their legacy "(Deleted)" behavior), but a LIVE sorter must be public to
 *  appear in someone else's history. Owners always see their own rows. */
export function rankedSorterVisibleToVisitors(): SQL {
  return or(
    isNull(sorters.id),
    eq(sorters.deleted, true),
    eq(sorters.visibility, "public"),
  )!;
}
