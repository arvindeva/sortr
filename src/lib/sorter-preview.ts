import { sql } from "drizzle-orm";
import { sorters } from "@/db/schema";

/** One item of a cover-less sorter's preview (feeds the card fallbacks). */
export interface SorterPreviewItem {
  title: string;
  imageUrl: string | null;
}

/**
 * First 6 current-version items (title + imageUrl) for sorters WITHOUT a
 * cover image — the card builds its fallback from them: 4+ item images →
 * 2×2 mosaic, 1–3 → first image full-bleed, none → title collage. Covered
 * sorters get [] (no extra work for the 75% majority). Add as
 * `previewItems: previewItemsSql` next to coverImageUrl in list queries.
 */
export const previewItemsSql = sql<SorterPreviewItem[]>`(
  case when ${sorters}."cover_image_url" is null then (
    select coalesce(
      json_agg(json_build_object('title', x.title, 'imageUrl', x."imageUrl")),
      '[]'::json
    )
    from (
      select i.title, i."imageUrl"
      from "sorterItems" i
      where i."sorterId" = ${sorters}."id" and i.version = ${sorters}."version"
      order by i.id
      limit 6
    ) x
  ) else '[]'::json end
)`;
// ^ Columns are qualified via the TABLE (${sorters}."id"), not drizzle column
// refs (${sorters.id}): drizzle renders column refs UNQUALIFIED in
// single-table queries, and inside the correlated subquery a bare "id"/
// "version" binds to sorterItems' own columns — the correlation silently
// never matches (bit the profile query; homepage/browse only worked because
// their joins force qualification).
