import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdminUserId } from "@/lib/admin";

// POST /api/admin/reports/[id] — resolve a report (admin only).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // 404 (not 403) for non-admins — don't reveal the route exists.
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const [updated] = await db
      .update(reports)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(reports.id, id))
      .returning({ id: reports.id });
    if (!updated) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error resolving report:", error);
    return NextResponse.json(
      { error: "Failed to resolve report." },
      { status: 500 },
    );
  }
}
