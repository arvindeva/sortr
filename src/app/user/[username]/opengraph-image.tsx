import {
  renderGenericOgImage,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-generic";

// Uses the generic "RANK ANYTHING" card for now. Replace with a dynamic,
// data-bound ImageResponse for this route later.
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderGenericOgImage();
}
