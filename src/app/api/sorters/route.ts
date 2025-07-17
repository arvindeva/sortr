import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { sorters, sorterItems, sorterGroups, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSorterSchema } from "@/lib/validations";
import { generateUniqueSlug } from "@/lib/utils";

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
        useGroups: validatedData.useGroups || false,
        userId: userData[0].id,
      })
      .returning();

    if (validatedData.useGroups && validatedData.groups) {
      // Generate unique slugs for all groups
      const groupNames = validatedData.groups.map(group => group.name);
      const existingSlugs: string[] = [];
      
      // Create groups and their items
      for (const group of validatedData.groups) {
        const slug = generateUniqueSlug(group.name, existingSlugs);
        existingSlugs.push(slug);
        
        const [newGroup] = await db
          .insert(sorterGroups)
          .values({
            sorterId: newSorter.id,
            name: group.name,
            slug: slug,
          })
          .returning();

        // Create items for this group
        await db.insert(sorterItems).values(
          group.items.map((item) => ({
            sorterId: newSorter.id,
            groupId: newGroup.id,
            title: item.title,
            imageUrl: item.imageUrl || null,
          })),
        );
      }
    } else {
      // Create sorter items without groups (traditional mode)
      if (validatedData.items) {
        await db.insert(sorterItems).values(
          validatedData.items.map((item) => ({
            sorterId: newSorter.id,
            groupId: null,
            title: item.title,
            imageUrl: item.imageUrl || null,
          })),
        );
      }
    }

    return NextResponse.json({
      success: true,
      sorter: newSorter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Error creating sorter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
