import Link from "next/link";
import { Card } from "@/components/ui/card";

interface SorterCardProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    creatorUsername: string;
    completionCount: number;
    viewCount: number;
    category?: string;
    coverImageUrl?: string;
  };
  className?: string;
}

export function SorterCard({ sorter, className }: SorterCardProps) {
  const firstLetter = sorter.title.charAt(0).toUpperCase();
  
  return (
    <Link href={`/sorter/${sorter.slug}`} className={`block w-full ${className || ""}`}>
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
            <div className="flex h-full w-full items-center justify-center bg-background dark:bg-secondary">
              <span className="text-6xl font-bold text-main -translate-y-6">
                {firstLetter}
              </span>
            </div>
          )}
        </div>
        
        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-main p-3">
          <div className="flex h-8 justify-center items-center">
            <h3 className="line-clamp-2 text-sm font-semibold text-background dark:text-foreground leading-tight text-center">
              {sorter.title}
            </h3>
          </div>
        </div>
      </Card>
    </Link>
  );
}
