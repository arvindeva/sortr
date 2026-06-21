import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <PageContainer width="narrow">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-7xl font-bold tracking-tight text-muted-foreground md:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
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
