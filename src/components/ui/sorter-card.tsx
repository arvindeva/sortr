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
      className={`block w-full ${className || ""}`}
    >
      <Card className="group relative aspect-square overflow-hidden transition-all hover:scale-[1.02]">
        {/* Background Image or Placeholder */}
        <div className="absolute inset-0">
          {sorter.coverImageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${sorter.coverImageUrl})`,
              }}
            />
          ) : (
            <div className="bg-background dark:bg-secondary flex h-full w-full items-center justify-center">
              <span className="text-main -translate-y-6 text-6xl font-bold">
                {firstLetter}
              </span>
            </div>
          )}
        </div>

        {/* Title Overlay */}
        <div className="bg-main absolute right-0 bottom-0 left-0 p-3">
          <div className="flex h-6 items-center justify-center sm:h-8">
            <h3 className="text-main-foreground font-base line-clamp-2 text-center text-base leading-tight">
              {sorter.title}
            </h3>
          </div>
        </div>
      </Card>
    </Link>
  );
}
