import { NextResponse } from "next/server";
import { db } from "@/db";
import { sorters, sortingResults, user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "https://sortr.dev";

    // Get all public sorters
    const publicSorters = await db
      .select({
        slug: sorters.slug,
        createdAt: sorters.createdAt,
      })
      .from(sorters)
      .orderBy(desc(sorters.createdAt));

    // Get recent results (limit to prevent huge sitemap)
    const recentResults = await db
      .select({
        id: sortingResults.id,
        createdAt: sortingResults.createdAt,
      })
      .from(sortingResults)
      .orderBy(desc(sortingResults.createdAt))
      .limit(1000); // Limit to prevent huge sitemap

    // Get user profiles (only with usernames)
    const userProfiles = await db
      .select({
        username: user.username,
        createdAt: user.emailVerified,
      })
      .from(user)
      .where(eq(user.username, user.username)) // Only users with usernames
      .limit(500); // Limit to prevent huge sitemap

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
  
  <!-- Rankings pages -->
  ${recentResults
    .map(
      (result) => `
  <url>
    <loc>${baseUrl}/rankings/${result.id}</loc>
    <lastmod>${new Date(result.createdAt).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
    )
    .join("")}
  
  <!-- User profiles -->
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
        "Cache-Control": "public, max-age=86400, revalidate", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
