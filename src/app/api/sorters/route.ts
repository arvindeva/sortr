import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sorters, sorterItems, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createSorterSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  category: z.string().max(50, "Category too long").optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1, "Item title is required").max(100, "Item title too long"),
        imageUrl: z.string().url("Invalid URL").optional(),
      })
    )
    .min(2, "At least 2 items are required")
    .max(50, "Too many items (max 50)"),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data
    const userData = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createSorterSchema.parse(body);

    // Create sorter
    const [newSorter] = await db
      .insert(sorters)
      .values({
        title: validatedData.title,
        description: validatedData.description || null,
        category: validatedData.category || null,
        userId: userData[0].id,
      })
      .returning();

    // Create sorter items
    await db.insert(sorterItems).values(
      validatedData.items.map((item) => ({
        sorterId: newSorter.id,
        title: item.title,
        imageUrl: item.imageUrl || null,
      }))
    );

    return NextResponse.json({
      success: true,
      sorter: newSorter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error("Error creating sorter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}