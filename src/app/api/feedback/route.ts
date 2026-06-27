import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { feedback } from "@/db/schema";

const MAX_MESSAGE_LEN = 2000;
const MAX_EMAIL_LEN = 200;

// Light in-memory rate limit: a few submissions per IP per window. Resets on
// deploy — fine for stopping obvious floods without a separate service.
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
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const email =
      typeof body?.email === "string" && body.email.trim()
        ? body.email.trim().slice(0, MAX_EMAIL_LEN)
        : null;
    const pageUrl =
      typeof body?.pageUrl === "string" ? body.pageUrl.slice(0, 500) : null;

    // Associate with the user if logged in (optional).
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    await db.insert(feedback).values({
      message: message.slice(0, MAX_MESSAGE_LEN),
      email,
      pageUrl,
      userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback." },
      { status: 500 },
    );
  }
}
