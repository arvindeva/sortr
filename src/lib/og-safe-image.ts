import sharp from "sharp";

// Tiles render at 200px in the 1200x630 card; a 400px source keeps them crisp.
const TILE_PX = 400;
const FETCH_TIMEOUT_MS = 3000;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/**
 * Fetch a remote item/cover image and re-encode it as a small baseline-JPEG
 * data URI for the OG card. Satori/resvg's WASM decoder must never see raw
 * uploads: a large or malformed image can corrupt the WASM instance's memory,
 * after which EVERY OG render fails with "memory access out of bounds" until
 * the process restarts (this took prod down on 2026-08-27). The presigned
 * direct-to-R2 upload path doesn't go through server-side sharp processing, so
 * arbitrary bytes in R2 are expected. On any failure the caller's tile falls
 * back to the accent-color name tile.
 */
export async function ogSafeImageDataUri(
  url: string | undefined,
): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url, {
      // no-store: image bytes must not land in the Next data cache
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const source = Buffer.from(await res.arrayBuffer());
    if (source.length === 0 || source.length > MAX_SOURCE_BYTES)
      return undefined;
    const jpeg = await sharp(source)
      .rotate() // bake EXIF orientation — resvg ignores it
      .resize(TILE_PX, TILE_PX, { fit: "cover" })
      .jpeg({ quality: 78 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}
