import {
  renderGenericOgImage,
  OG_SIZE,
  OG_ALT,
  OG_CONTENT_TYPE,
} from "@/lib/og-generic";

// Site-wide default OG / share card (the "RANK ANYTHING" generic card). Next
// uses this for `/` and every route that doesn't define its own metadata
// images. Routes that DO set their own openGraph metadata re-export this via
// their own opengraph-image.tsx (the file convention doesn't merge into a
// route's explicit metadata object).
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderGenericOgImage();
}
