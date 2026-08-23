/**
 * The category-hub registry: single source of truth for the 15 real
 * categories' display names, URL slugs, and landing-page blurbs. "Other"
 * and uncategorized sorters deliberately have no hub (junk drawer).
 * Pure — safe for client and server imports.
 */

export interface CategoryHub {
  /** Display name — matches the `sorters.category` column exactly. */
  name: string;
  /** URL slug under /sorters/. */
  slug: string;
  /** ~2-sentence landing blurb, fandom voice. */
  blurb: string;
}

export const CATEGORY_HUBS: CategoryHub[] = [
  {
    name: "Video Games",
    slug: "video-games",
    blurb:
      "Rank your favorite games, characters, bosses, soundtracks, and skins — one matchup at a time. From decades-long franchises to this month's gacha banner, if a fandom argues about it, there's a sorter for it.",
  },
  {
    name: "Music",
    slug: "music",
    blurb:
      "Discographies, title tracks, b-sides, and bias sorters — settle what your actual favorite is by picking head-to-head instead of agonizing over a list. K-pop comebacks and 40-year catalogs welcome alike.",
  },
  {
    name: "Movies & TV",
    slug: "movies-tv",
    blurb:
      "Rank a director's filmography, a show's characters, or every episode of the thing you've rewatched five times. Two options at a time — your definitive watch order builds itself.",
  },
  {
    name: "Anime & Manga",
    slug: "anime-manga",
    blurb:
      "Character sorters are an anime fandom tradition, and this is their home: rank a series' whole cast, your ships, or a season's openings head-to-head. Best girl and best boy, finally settled.",
  },
  {
    name: "Internet",
    slug: "internet",
    blurb:
      "Streamers, memes, creators, and everything terminally online — rank the internet's output one duel at a time. The comment section can argue with your results, not your methods.",
  },
  {
    name: "Books",
    slug: "books",
    blurb:
      "Rank an author's bibliography, a series' characters, or your entire shelf of favorites. Head-to-head matchups are gentler than choosing a single favorite book outright — and more honest.",
  },
  {
    name: "Sports",
    slug: "sports",
    blurb:
      "GOAT debates, kit rankings, all-time XIs — put them through actual matchups instead of a shouting match. Rank athletes, clubs, and moments from any sport, one head-to-head at a time.",
  },
  {
    name: "Hobbies",
    slug: "hobbies",
    blurb:
      "Whatever you collect, build, paint, or play — rank it. Board games, trading cards, crafts, and every niche pursuit deserve a definitive personal ranking too.",
  },
  {
    name: "Fashion",
    slug: "fashion",
    blurb:
      "Rank outfits, eras, collections, and looks head-to-head. From red-carpet moments to a group's stage fits, style arguments finally get a scoreboard.",
  },
  {
    name: "Food",
    slug: "food",
    blurb:
      "Snacks, cuisines, menu items, regional specialties — rank what you'd actually reach for first, one pairing at a time. Deliciously low-stakes, surprisingly heated.",
  },
  {
    name: "Academics",
    slug: "academics",
    blurb:
      "Rank philosophers, historical eras, equations, or the periodic table if you're feeling brave. Learning what you value most in a field is half the fun.",
  },
  {
    name: "Tech",
    slug: "tech",
    blurb:
      "Gadgets, programming languages, apps, and the eternal editor wars — give your takes a ranking backed by actual choices instead of vibes.",
  },
  {
    name: "Travel",
    slug: "travel",
    blurb:
      "Rank cities, countries, and places you've been — or dream of. Two destinations at a time makes the impossible question of a favorite surprisingly answerable.",
  },
  {
    name: "Nature",
    slug: "nature",
    blurb:
      "Animals, landscapes, seasons, sea creatures — the natural world, ranked by what moves you most. Wholesome matchups, occasionally ruthless results.",
  },
  {
    name: "Vehicles",
    slug: "vehicles",
    blurb:
      "Cars, motorcycles, trains, planes — rank the machines you love head-to-head. Spec sheets argue horsepower; your matchups decide the heart's winner.",
  },
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
