import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { eq, desc, asc, sql, ilike, or, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get("q") || "";
    const categoriesParam = searchParams.get("categories") || "";
    const categories = categoriesParam
      ? categoriesParam.split(",").filter(Boolean)
      : [];
    const sort = searchParams.get("sort") || "popular";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20")),
    );
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];

    // Text search - search in title, description, and creator username
    if (query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(sorters.title, searchTerm),
          ilike(sorters.description, searchTerm),
          ilike(user.username, searchTerm),
        ),
      );
    }

    // Category filter with OR logic
    if (categories.length > 0) {
      conditions.push(inArray(sorters.category, categories));
    }

    // Build complete queries with all conditions at once
    const baseQuery = db
      .select({
        id: sorters.id,
        title: sorters.title,
        slug: sorters.slug,
        description: sorters.description,
        category: sorters.category,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        createdAt: sorters.createdAt,
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

    // Apply conditions if any
    const finalQuery =
      conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    const finalCountQuery =
      conditions.length > 0
        ? countQueryBase.where(and(...conditions))
        : countQueryBase;

    // Apply sorting and pagination
    const sortedQuery =
      sort === "recent"
        ? finalQuery.orderBy(desc(sorters.createdAt))
        : finalQuery.orderBy(desc(sorters.completionCount));

    // Execute both queries
    const [sortedSorters, countResult] = await Promise.all([
      sortedQuery.limit(limit).offset(offset),
      finalCountQuery,
    ]);

    const totalCount = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      sorters: sortedSorters,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    console.error("Error in browse API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
