import { NextResponse } from "next/server";
import { db } from "@/db";
import { sorters, user } from "@/db/schema";
import { and, eq, desc, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    // Strip any trailing slash so `${baseUrl}/sorter/...` can't produce a
    // double slash (NEXTAUTH_URL is set with a trailing slash in prod, which
    // was emitting redirecting `//sorter/...` URLs that hurt indexing).
    const baseUrl = (process.env.NEXTAUTH_URL || "https://sortr.io").replace(
      /\/$/,
      "",
    );

    // Get all public sorters (active, not deleted — matches app visibility).
    const publicSorters = await db
      .select({
        slug: sorters.slug,
        createdAt: sorters.createdAt,
      })
      .from(sorters)
      .where(and(eq(sorters.deleted, false), eq(sorters.status, "active")))
      .orderBy(desc(sorters.createdAt));

    // Individual ranking pages are intentionally NOT listed: they're thin and
    // near-duplicate ("X's ranking of Y"), nobody searches for them, and listing
    // thousands wastes crawl budget. They stay crawlable via links from sorters.

    // User profiles — only users who actually created a public sorter. An empty
    // profile is a thin, valueless page; restricting to creators keeps the
    // sitemap to pages worth indexing.
    const userProfiles = await db
      .selectDistinct({
        username: user.username,
        createdAt: user.emailVerified,
      })
      .from(user)
      .innerJoin(sorters, eq(sorters.userId, user.id))
      .where(
        and(
          isNotNull(user.username),
          eq(sorters.deleted, false),
          eq(sorters.status, "active"),
        ),
      );

    // Build sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Sorter pages -->
  ${publicSorters
    .map(
      (sorter) => `
  <url>
    <loc>${baseUrl}/sorter/${sorter.slug}</loc>
    <lastmod>${new Date(sorter.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join("")}

  <!-- User profiles (creators only) -->
  ${userProfiles
    .filter((profile) => profile.username) // Extra safety check
    .map(
      (profile) => `
  <url>
    <loc>${baseUrl}/user/${profile.username}</loc>
    <lastmod>${profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`,
    )
    .join("")}
</urlset>`;

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
