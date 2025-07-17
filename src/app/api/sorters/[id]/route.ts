import { db } from "@/db";
import { sorters, sorterItems, sorterGroups, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get sorter data with creator info
    const sorterData = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        description: sorters.description,
        category: sorters.category,
        useGroups: sorters.useGroups,
        createdAt: sorters.createdAt,
        completionCount: sorters.completionCount,
        viewCount: sorters.viewCount,
        creatorUsername: user.username,
        creatorId: user.id,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(eq(sorters.id, id))
      .limit(1);

    if (sorterData.length === 0) {
      return Response.json({ error: "Sorter not found" }, { status: 404 });
    }

    const sorter = sorterData[0];

    if (sorter.useGroups) {
      // Get groups with their items
      const groups = await db
        .select({
          id: sorterGroups.id,
          name: sorterGroups.name,
          createdAt: sorterGroups.createdAt,
        })
        .from(sorterGroups)
        .where(eq(sorterGroups.sorterId, id));

      // Get all items with their group IDs
      const items = await db
        .select({
          id: sorterItems.id,
          title: sorterItems.title,
          imageUrl: sorterItems.imageUrl,
          groupId: sorterItems.groupId,
        })
        .from(sorterItems)
        .where(eq(sorterItems.sorterId, id));

      // Group items by group
      const groupsWithItems = groups.map(group => ({
        ...group,
        items: items.filter(item => item.groupId === group.id),
      }));

      return Response.json({
        sorter,
        groups: groupsWithItems,
        items: items, // Also return flat items list for backward compatibility
      });
    } else {
      // Get sorter items (traditional mode)
      const items = await db
        .select({
          id: sorterItems.id,
          title: sorterItems.title,
          imageUrl: sorterItems.imageUrl,
        })
        .from(sorterItems)
        .where(eq(sorterItems.sorterId, id));

      return Response.json({
        sorter,
        items,
      });
    }
  } catch (error) {
    console.error("Error fetching sorter:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
