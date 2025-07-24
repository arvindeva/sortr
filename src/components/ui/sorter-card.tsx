import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Trophy } from "lucide-react";

interface SorterCardProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    creatorUsername: string;
    completionCount: number;
    viewCount: number;
    category?: string;
  };
  className?: string;
}

export function SorterCard({ sorter, className }: SorterCardProps) {
  return (
    <Card key={sorter.id} className={`md:min-h-[160px] ${className || ""}`}>
      <CardHeader className="flex-1">
        <div className="flex-1">
          <div className="flex flex-col">
            <CardTitle className="line-clamp-2">
              <Link
                href={`/sorter/${sorter.slug}`}
                className="sorter-title-link hover:underline"
              >
                {sorter.title}
              </Link>
            </CardTitle>
            <p className="font-medium">
              by{" "}
              <Link
                href={`/user/${sorter.creatorUsername}`}
                className="sorter-title-link font-semibold hover:underline"
              >
                {sorter.creatorUsername || "Unknown User"}
              </Link>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-foreground flex items-center justify-between font-medium">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span>{sorter.viewCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy size={16} />
              <span>{sorter.completionCount}</span>
            </div>
          </div>
          {sorter.category && (
            <Badge variant="default" className="hidden md:block">
              {sorter.category}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
