import { db } from "@/db";
import {
  sorters,
  sorterItems,
  sorterTags,
  user,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";

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

// Immutable core data (items + tags with relationships)
interface CoreSorterData {
  id: string;
  userId: string;
  createdAt: Date;
  category: string | null;
  description: string | null;
  items: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
    tagSlugs?: string[] | null;
  }>;
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
}

// Dynamic metadata (changes frequently)
interface DynamicSorterMetadata {
  id: string; // Sorter ID
  title: string;
  slug: string;
  coverImageUrl: string | null;
  completionCount: number;
  version: number;
  username: string | null;
  ownerUserId: string | null;
  deleted: boolean;
  status: string;
}

// Fetch core immutable data (uncached version)
async function getCoreSorterDataUncached(
  sorterId: string
): Promise<CoreSorterData | null> {
  // Query items, tags, and static sorter fields
  const sorterData = await db
    .select({
      id: sorters.id,
      userId: sorters.userId,
      createdAt: sorters.createdAt,
      category: sorters.category,
      description: sorters.description,
    })
    .from(sorters)
    .where(eq(sorters.id, sorterId))
    .limit(1);

  if (sorterData.length === 0) return null;

  const sorter = sorterData[0];

  // Fetch tags and items (same as current implementation)
  const tags = await db
    .select({
      id: sorterTags.id,
      name: sorterTags.name,
      slug: sorterTags.slug,
      sortOrder: sorterTags.sortOrder,
    })
    .from(sorterTags)
    .where(eq(sorterTags.sorterId, sorterId));

  const items = await db
    .select({
      id: sorterItems.id,
      title: sorterItems.title,
      imageUrl: sorterItems.imageUrl,
      tagSlugs: sorterItems.tagSlugs,
    })
    .from(sorterItems)
    .where(eq(sorterItems.sorterId, sorterId));

  if (tags.length > 0) {
    const tagsWithItems = tags.map((tag) => ({
      ...tag,
      items: items
        .filter(
          (item) =>
            (item.tagSlugs && item.tagSlugs.includes(tag.slug)) ||
            !item.tagSlugs ||
            item.tagSlugs.length === 0
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          imageUrl: item.imageUrl,
        })),
    }));

    return {
      ...sorter,
      items,
      tags: tagsWithItems,
    };
  }

  return {
    ...sorter,
    items,
  };
}

// Fetch dynamic metadata (NOT cached - this is a small, fast query)
// We don't cache this because we need the current version to cache the core data correctly
async function getDynamicSorterMetadata(
  slug: string
): Promise<DynamicSorterMetadata | null> {
  const metadataData = await db
    .select({
      id: sorters.id,
      title: sorters.title,
      slug: sorters.slug,
      coverImageUrl: sorters.coverImageUrl,
      completionCount: sorters.completionCount,
      version: sorters.version,
      deleted: sorters.deleted,
      status: sorters.status,
      ownerUserId: sorters.userId,
      username: user.username,
      userIdFromJoin: user.id,
    })
    .from(sorters)
    .leftJoin(user, eq(sorters.userId, user.id))
    .where(eq(sorters.slug, slug))
    .limit(1);

  if (metadataData.length === 0) return null;

  const metadata = metadataData[0];

  return {
    id: metadata.id,
    title: metadata.title,
    slug: metadata.slug,
    coverImageUrl: metadata.coverImageUrl,
    completionCount: metadata.completionCount,
    version: metadata.version,
    username: metadata.username,
    ownerUserId: metadata.ownerUserId,
    deleted: metadata.deleted,
    status: metadata.status,
  };
}

// Combined data fetcher (with React cache for request deduplication + unstable_cache for core data)
export const getSorterDataCached = cache(async function getSorterDataCachedImpl(
  slug: string
): Promise<SorterPayload | null> {
  // Fetch dynamic metadata (NOT cached - always fresh)
  const metadata = await getDynamicSorterMetadata(slug);

  if (!metadata) return null;

  // Check if sorter is active
  if (metadata.deleted || metadata.status !== "active") {
    return null;
  }

  // Fetch core data (CACHED by version - automatic invalidation when version changes)
  const coreData = await unstable_cache(
    async () => getCoreSorterDataUncached(metadata.id),
    [`sorter-core-v3`, metadata.id, `v${metadata.version}`],
    {
      revalidate: false, // Cache forever - version change = new cache key
    }
  )();

  if (!coreData) return null;

  // Merge core data with dynamic metadata
  return {
    sorter: {
      id: coreData.id,
      title: metadata.title,
      description: coreData.description,
      category: coreData.category,
      slug: metadata.slug,
      coverImageUrl: metadata.coverImageUrl,
      createdAt: coreData.createdAt,
      completionCount: metadata.completionCount,
      version: metadata.version,
      userId: coreData.userId,
      creatorUsername: metadata.username,
      creatorId: metadata.ownerUserId,
      user: {
        username: metadata.username,
        id: metadata.ownerUserId,
      },
    },
    items: coreData.items,
    tags: coreData.tags,
  };
});
