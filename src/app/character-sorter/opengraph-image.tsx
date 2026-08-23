import {
  renderGenericOgImage,
  renderSorterOgImage,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-generic";
import { getTrendingSorters } from "@/lib/trending-sorters";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  try {
    const trending = await getTrendingSorters(12);
    const flavored = trending.filter((s) => /character|bias|ship/i.test(s.title));
    const items = (flavored.length >= 3 ? flavored : trending).slice(0, 8);
    return renderSorterOgImage({
      title: "Character Sorter",
      itemCount: items.length,
      subtitle: "rank your favorite characters head-to-head",
      items: items.map((s) => ({
        id: s.id,
        title: s.title,
        imageUrl: s.coverImageUrl,
      })),
    });
  } catch {
    return renderGenericOgImage();
  }
}
