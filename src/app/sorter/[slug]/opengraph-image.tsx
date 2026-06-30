import {
  renderGenericOgImage,
  renderSorterOgImage,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-generic";
import { getSorterDataCached } from "@/lib/sorter-data";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  try {
    const data = await getSorterDataCached(params.slug);
    if (!data) return renderGenericOgImage();

    return renderSorterOgImage({
      title: data.sorter.title,
      itemCount: data.items.length,
      items: data.items.map((it) => ({
        id: it.id,
        title: it.title,
        imageUrl: it.imageUrl ?? undefined,
      })),
    });
  } catch {
    // Never let the OG image break — fall back to the generic card.
    return renderGenericOgImage();
  }
}
