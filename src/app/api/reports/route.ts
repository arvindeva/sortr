import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { reports, sorters } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isReportReason } from "@/lib/report-reasons";

const MAX_DETAILS_LEN = 2000;
const MAX_EMAIL_LEN = 200;

// Light in-memory rate limit, same shape as /api/feedback: a few submissions
// per IP per window. Resets on deploy — fine for stopping obvious floods.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many submissions, please slow down." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const reason = body?.reason;
    if (!slug || !isReportReason(reason)) {
      return NextResponse.json(
        { error: "Sorter and reason are required." },
        { status: 400 },
      );
    }

    const details =
      typeof body?.details === "string" && body.details.trim()
        ? body.details.trim().slice(0, MAX_DETAILS_LEN)
        : null;
    const email =
      typeof body?.email === "string" && body.email.trim()
        ? body.email.trim().slice(0, MAX_EMAIL_LEN)
        : null;

    // The report references the sorter row when it exists; the slug snapshot
    // is stored either way so the report is actionable even after deletion.
    const [sorterRow] = await db
      .select({ id: sorters.id })
      .from(sorters)
      .where(and(eq(sorters.slug, slug), eq(sorters.deleted, false)))
      .limit(1);

    const session = await getServerSession(authOptions);
    const reporterUserId =
      (session?.user as { id?: string } | undefined)?.id ?? null;

    await db.insert(reports).values({
      sorterId: sorterRow?.id ?? null,
      sorterSlug: slug.slice(0, 200),
      reason,
      details,
      email,
      reporterUserId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving report:", error);
    return NextResponse.json(
      { error: "Failed to save report." },
      { status: 500 },
    );
  }
}
