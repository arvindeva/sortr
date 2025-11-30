import { db } from "@/db";
import {
  sorters,
  sorterItems,
  sorterTags,
  user,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export interface SorterPayload {
  sorter: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    slug: string;
    coverImageUrl: string | null;
    createdAt: Date;
    completionCount: number;
    version: number;
    userId: string;
    creatorUsername: string | null;
    creatorId: string | null;
    user: {
      username: string | null;
      id: string | null;
    };
  };
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number | null;
    items: Array<{
      id: string;
      title: string;
      imageUrl: string | null;
    }>;
  }>;
  items: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
    tagSlugs?: string[] | null;
  }>;
}

async function getSorterDataUncached(slug: string): Promise<SorterPayload | null> {
    const sorterData = await db
      .select({
        id: sorters.id,
        title: sorters.title,
        description: sorters.description,
        category: sorters.category,
        slug: sorters.slug,
        coverImageUrl: sorters.coverImageUrl,
        createdAt: sorters.createdAt,
        completionCount: sorters.completionCount,
        version: sorters.version,
        userId: sorters.userId,
        creatorUsername: user.username,
        creatorId: user.id,
        deleted: sorters.deleted,
        status: sorters.status,
      })
      .from(sorters)
      .leftJoin(user, eq(sorters.userId, user.id))
      .where(
        and(
          eq(sorters.slug, slug),
          eq(sorters.deleted, false),
          eq(sorters.status, "active"),
        ),
      )
      .limit(1);

    if (sorterData.length === 0) {
      return null;
    }

    const sorter = sorterData[0];
    const sorterWithUser = {
      ...sorter,
      user: {
        username: sorter.creatorUsername,
        id: sorter.creatorId,
      },
    };

    const tags = await db
      .select({
        id: sorterTags.id,
        name: sorterTags.name,
        slug: sorterTags.slug,
        sortOrder: sorterTags.sortOrder,
      })
      .from(sorterTags)
      .where(eq(sorterTags.sorterId, sorter.id));

    if (tags.length > 0) {
      const items = await db
        .select({
          id: sorterItems.id,
          title: sorterItems.title,
          imageUrl: sorterItems.imageUrl,
          tagSlugs: sorterItems.tagSlugs,
        })
        .from(sorterItems)
        .where(eq(sorterItems.sorterId, sorter.id));

      const tagsWithItems = tags.map((tag) => ({
        ...tag,
        items: items
          .filter(
            (item) =>
              (item.tagSlugs && item.tagSlugs.includes(tag.slug)) ||
              !item.tagSlugs ||
              item.tagSlugs.length === 0,
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
          })),
      }));

      return {
        sorter: sorterWithUser,
        tags: tagsWithItems,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
          tagSlugs: item.tagSlugs,
        })),
      };
    }

    const items = await db
      .select({
        id: sorterItems.id,
        title: sorterItems.title,
        imageUrl: sorterItems.imageUrl,
      })
      .from(sorterItems)
      .where(eq(sorterItems.sorterId, sorter.id));

    return {
      sorter: sorterWithUser,
      items,
    };
}

export async function getSorterDataCached(slug: string): Promise<SorterPayload | null> {
  // Direct database call - no caching layer
  return getSorterDataUncached(slug);
}
