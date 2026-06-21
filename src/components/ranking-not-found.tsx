import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Home, Search } from "lucide-react";

interface RankingNotFoundProps {
  rankingId?: string;
}

export function RankingNotFound({ rankingId }: RankingNotFoundProps) {
  return (
    <PageContainer width="narrow">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-6xl md:text-7xl">🏆</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          Ranking Not Found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {rankingId
            ? `The ranking with ID "${rankingId}" doesn't exist or has been deleted.`
            : "The ranking you're looking for doesn't exist or has been deleted."}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The ranking may have been removed by its creator or never existed.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home size={16} />
              Go Home
            </Link>
          </Button>
          <Button variant="neutral" asChild>
            <Link href="/browse" className="flex items-center gap-2">
              <Search size={16} />
              Browse Sorters
            </Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
