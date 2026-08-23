/**
 * The category-hub registry: single source of truth for the 15 real
 * categories' display names and URL slugs. "Other"
 * and uncategorized sorters deliberately have no hub (junk drawer).
 * Pure — safe for client and server imports.
 */

export interface CategoryHub {
  /** Display name — matches the `sorters.category` column exactly. */
  name: string;
  /** URL slug under /sorters/. */
  slug: string;
}

/**
 * The one hub blurb — plain and product-first (per-category copy read as
 * marketing; the voice guide says state what it does).
 */
export function hubBlurb(name: string): string {
  return `Head-to-head sorters for ${name.toLowerCase()}: two options at a time, pick the one you prefer, and your full ranking builds itself. Play what the community has made, or create your own.`;
}

export const CATEGORY_HUBS: CategoryHub[] = [
  { name: "Video Games", slug: "video-games" },
  { name: "Music", slug: "music" },
  { name: "Movies & TV", slug: "movies-tv" },
  { name: "Anime & Manga", slug: "anime-manga" },
  { name: "Internet", slug: "internet" },
  { name: "Books", slug: "books" },
  { name: "Sports", slug: "sports" },
  { name: "Hobbies", slug: "hobbies" },
  { name: "Fashion", slug: "fashion" },
  { name: "Food", slug: "food" },
  { name: "Academics", slug: "academics" },
  { name: "Tech", slug: "tech" },
  { name: "Travel", slug: "travel" },
  { name: "Nature", slug: "nature" },
  { name: "Vehicles", slug: "vehicles" },
];

const bySlug = new Map(CATEGORY_HUBS.map((c) => [c.slug, c]));
const byName = new Map(CATEGORY_HUBS.map((c) => [c.name, c]));

/** Hub for a URL slug, or undefined (unknown, or the slug "other"). */
export function categoryBySlug(slug: string): CategoryHub | undefined {
  return bySlug.get(slug);
}

/** Hub slug for a category display name, or undefined (Other/none/unknown). */
export function slugForCategory(
  name: string | null | undefined,
): string | undefined {
  return name ? byName.get(name)?.slug : undefined;
}
