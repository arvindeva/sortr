import {
  renderGenericOgImage,
  renderRankingOgImage,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-generic";
import { getResultData } from "./page";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: { id: string };
}) {
  try {
    const data = await getResultData(params.id);
    if (!data) return renderGenericOgImage();

    return renderRankingOgImage({
      sorterTitle: data.sorter.title,
      username: data.result.username || "Anonymous",
      items: data.result.rankings.map((r) => ({
        id: r.id,
        title: r.title,
        imageUrl: r.imageUrl,
      })),
    });
  } catch {
    // Never let the OG image break — fall back to the generic card.
    return renderGenericOgImage();
  }
}
