import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc, sql, ilike, or, and, inArray } from "drizzle-orm";

export interface BrowseParams {
  query?: string;
  categories?: string[];
  sort?: string; // "popular" | "recent"
  page?: number;
  limit?: number;
}

export interface BrowseSorter {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  completionCount: number;
  createdAt: string;
  coverImageUrl?: string;
  creatorUsername: string;
}

export interface BrowseResult {
  sorters: BrowseSorter[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Shared browse query — used by both the /api/browse route (client-side
 * filtering) and the server-rendered /browse page (SEO + first paint).
 */
export async function getBrowseSorters(
  params: BrowseParams,
): Promise<BrowseResult> {
  const query = params.query?.trim() || "";
  const categories = params.categories ?? [];
  const sort = params.sort || "popular";
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [
    eq(sorters.deleted, false),
    eq(sorters.status, "active"),
  ];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(
        ilike(sorters.title, term),
        ilike(sorters.description, term),
        ilike(user.username, term),
      )!,
    );
  }

  if (categories.length > 0) {
    conditions.push(inArray(sorters.category, categories));
  }

  const baseQuery = db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      description: sorters.description,
      category: sorters.category,
      completionCount: sorters.completionCount,
      createdAt: sorters.createdAt,
      coverImageUrl: sorters.coverImageUrl,
      creatorUsername: user.username,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .$dynamic();

  const countQueryBase = db
    .select({ count: sql<number>`count(*)` })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .$dynamic();

  const finalQuery = baseQuery.where(and(...conditions));
  const finalCountQuery = countQueryBase.where(and(...conditions));

  const sortedQuery =
    sort === "recent"
      ? finalQuery.orderBy(desc(sorters.createdAt))
      : finalQuery.orderBy(desc(sorters.completionCount));

  const [rows, countResult] = await Promise.all([
    sortedQuery.limit(limit).offset(offset),
    finalCountQuery,
  ]);

  const totalCount = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    sorters: rows.map((r) => ({
      ...r,
      description: r.description ?? undefined,
      category: r.category ?? undefined,
      coverImageUrl: r.coverImageUrl ?? undefined,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      creatorUsername: r.creatorUsername ?? "Unknown",
    })),
    totalCount,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
