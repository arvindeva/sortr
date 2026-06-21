import Link from "next/link";
import { Card } from "@/components/ui/card";

interface SorterCardProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    creatorUsername: string;
    completionCount: number;
    category?: string;
    coverImageUrl?: string;
  };
  className?: string;
}

export function SorterCard({ sorter, className }: SorterCardProps) {
  const firstLetter = sorter.title.charAt(0).toUpperCase();

  return (
    <Link
      href={`/sorter/${sorter.slug}`}
      className={`group block w-full ${className || ""}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-base transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
        {/* Background Image or Placeholder */}
        <div className="absolute inset-0">
          {sorter.coverImageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center transition-transform duration-200 group-hover:scale-105"
              style={{
                backgroundImage: `url(${sorter.coverImageUrl})`,
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <span className="text-6xl font-semibold text-muted-foreground/30">
                {firstLetter}
              </span>
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Title Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white">
            {sorter.title}
          </h3>
          <p className="mt-1 text-sm text-white/70">
            by {sorter.creatorUsername}
          </p>
        </div>
      </div>
    </Link>
  );
}
