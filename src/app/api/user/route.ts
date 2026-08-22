import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { user, sorters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { updateUsernameSchema } from "@/lib/validations";
import { deleteFromR2, deleteR2Prefix, getAvatarKey } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter is required" },
      { status: 400 },
    );
  }

  try {
    const users = await db
      .select({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(users[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateUsernameSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { username } = validationResult.data;

    // Get current user
    const currentUser = await db
      .select({ id: user.id, username: user.username })
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = currentUser[0].id;

    // Check if username is already taken (case-insensitive)
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 },
      );
    }

    const oldUsername = currentUser[0].username;

    // Update username
    await db.update(user).set({ username }).where(eq(user.id, userId));

    return NextResponse.json({
      message: "Username updated successfully",
      username,
    });
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Self-serve account deletion. Deletes the SESSION user (never a
 * client-supplied id). The single user-row delete does the heavy lifting via
 * verified FK behavior: sorters (+ their items/tags via their own cascades),
 * account links, and sessions cascade-delete; sortingResults.userId is
 * set-null, so completed rankings survive anonymized. R2 cleanup (avatar +
 * each sorter's image folder) runs AFTER the DB delete and is best-effort —
 * the privacy-critical data is the DB row; an orphaned image folder is
 * cleanup, not a leak of the account.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Gather R2 locations BEFORE the delete — unrecoverable after cascades.
    const [userRow] = await db
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, userId));
    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const ownedSorters = await db
      .select({ id: sorters.id })
      .from(sorters)
      .where(eq(sorters.userId, userId));

    await db.delete(user).where(eq(user.id, userId));

    // Best-effort R2 cleanup; failures log but never fail the request —
    // the account is already gone.
    if (userRow.image) {
      try {
        await deleteFromR2(getAvatarKey(userId));
      } catch (error) {
        console.error(`Account deletion: avatar cleanup failed for ${userId}:`, error);
      }
    }
    for (const s of ownedSorters) {
      await deleteR2Prefix(`sorters/${s.id}/`);
    }

    console.log(
      `Account deleted: ${userId} (${ownedSorters.length} sorters, images cleaned best-effort)`,
    );
    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
