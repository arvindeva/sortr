import Link from "next/link";
import { CoverTile } from "@/components/ui/cover-tile";
import { cn, accentFor } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";
import type { SorterPreviewItem } from "@/lib/sorter-preview";

interface SorterCardProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl?: string;
    /** First items of a cover-less sorter (title + imageUrl) — drives the
     *  mosaic / collage fallbacks. Absent or empty → plain accent tile. */
    previewItems?: SorterPreviewItem[] | null;
    /** Present for the owner's own profile view; non-owners never receive
     *  non-public sorters, so a non-"public" value only ever renders there. */
    visibility?: string;
  };
  className?: string;
}

// Alternating row sizes for the title collage (px) — texture, not content.
const COLLAGE_SIZES = [30, 19, 26, 18, 24, 19];

/**
 * The canonical sorter card: a square cover with the title pinned to the
 * bottom over a black scrim (mirrors the shareable ranking image's squares).
 * Cover-less sorters fall back, in order: 2×2 mosaic of item thumbnails
 * (4+ item images) → first item image full-bleed (1–3) → a collage of the
 * item titles on the accent color (text-only sorters) → bare accent tile.
 */
export function SorterCard({ sorter, className }: SorterCardProps) {
  const preview = sorter.previewItems ?? [];
  const previewImages = preview.filter(
    (p): p is SorterPreviewItem & { imageUrl: string } => !!p.imageUrl,
  );

  let cover: React.ReactNode;
  if (sorter.coverImageUrl) {
    cover = (
      <CoverTile
        imageUrl={sorter.coverImageUrl}
        name={sorter.title}
        colorKey={sorter.slug}
        hideName
        radius={0}
        className="absolute inset-0 h-full w-full"
      />
    );
  } else if (previewImages.length >= 4) {
    // Auto-cover: the first four item thumbnails. Accent behind each cell so
    // a missing thumbnail degrades to a color block instead of a hole.
    cover = (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
        {previewImages.slice(0, 4).map((p, i) => (
          <div
            key={i}
            className="bg-cover bg-center"
            style={{
              backgroundColor: accentFor(sorter.slug),
              backgroundImage: `url(${getImageUrl(p.imageUrl, "thumbnail")})`,
            }}
          />
        ))}
      </div>
    );
  } else if (previewImages.length >= 1) {
    cover = (
      <CoverTile
        imageUrl={previewImages[0].imageUrl}
        name={sorter.title}
        colorKey={sorter.slug}
        hideName
        radius={0}
        className="absolute inset-0 h-full w-full"
      />
    );
  } else if (preview.length > 0) {
    // Text-only sorter: its item titles as texture ("busy rows").
    cover = (
      <div
        className="absolute inset-0 flex flex-col justify-center gap-0.5 overflow-hidden px-3 pb-14"
        style={{ background: accentFor(sorter.slug) }}
      >
        {preview.slice(0, 6).map((p, i) => (
          <span
            key={i}
            aria-hidden
            className="display max-w-full overflow-hidden uppercase text-ellipsis whitespace-nowrap"
            style={{
              fontSize: COLLAGE_SIZES[i % COLLAGE_SIZES.length],
              color: "rgba(0,0,0,.22)",
              lineHeight: 0.95,
            }}
          >
            {p.title}
          </span>
        ))}
      </div>
    );
  } else {
    // No preview data supplied (or none exists) — plain accent tile.
    cover = (
      <CoverTile
        imageUrl={undefined}
        name={sorter.title}
        colorKey={sorter.slug}
        hideName
        radius={0}
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <Link
      href={`/sorter/${sorter.slug}`}
      className={cn("group block h-full w-full", className)}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:-translate-y-1 group-hover:border-main/50 group-hover:shadow-[0_0_32px_rgba(255,46,126,.28)]">
        {cover}

        {/* Bottom scrim keeps the title legible over any cover. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[55%]"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(0,0,0,.82))",
          }}
        />

        {/* Title — pinned bottom-left, clamped to 3 lines. Padding lives on
            the wrapper: line-clamp only hides overflow past the CONTENT box,
            so padding on the clamped element lets a clipped extra line paint
            into it (the "sliver below the last line" bug). */}
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          <h3
            className="display normal-case line-clamp-3 text-[15px] font-extrabold leading-[1.05] text-white sm:text-[19px]"
            title={sorter.title}
          >
            {sorter.title}
          </h3>
        </div>

        {sorter.visibility && sorter.visibility !== "public" && (
          <span className="hud absolute top-2 right-2 z-10 rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
            {sorter.visibility}
          </span>
        )}
      </div>
    </Link>
  );
}
