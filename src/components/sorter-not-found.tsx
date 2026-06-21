import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Home, Search, Plus } from "lucide-react";

interface SorterNotFoundProps {
  slug?: string;
}

export function SorterNotFound({ slug }: SorterNotFoundProps) {
  return (
    <PageContainer width="narrow">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-6xl md:text-7xl">🤔</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          Sorter Not Found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {slug
            ? `The sorter "${slug}" doesn't exist or has been deleted.`
            : "The sorter you're looking for doesn't exist or has been deleted."}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Maybe it was moved, or perhaps you mistyped the URL?
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
          <Button variant="neutral" asChild>
            <Link href="/create" className="flex items-center gap-2">
              <Plus size={16} />
              Create Sorter
            </Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
