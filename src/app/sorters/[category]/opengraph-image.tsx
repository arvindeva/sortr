import {
  renderGenericOgImage,
  renderSorterOgImage,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-generic";
import { categoryBySlug } from "@/lib/categories";
import {
  getCategoryCount,
  getTrendingInCategory,
} from "@/lib/category-sorters";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: { category: string };
}) {
  try {
    const hub = categoryBySlug(params.category);
    if (!hub) return renderGenericOgImage();

    const [trending, total] = await Promise.all([
      getTrendingInCategory(hub.name, 8),
      getCategoryCount(hub.name),
    ]);
    if (total === 0) return renderGenericOgImage();

    return renderSorterOgImage({
      title: `${hub.name} Sorters`,
      itemCount: total,
      subtitle: `${total.toLocaleString()} ${total === 1 ? "sorter" : "sorters"} · rank them head-to-head`,
      items: trending.map((s) => ({
        id: s.id,
        title: s.title,
        imageUrl: s.coverImageUrl,
      })),
    });
  } catch {
    // Never let the OG image break — fall back to the generic card.
    return renderGenericOgImage();
  }
}
