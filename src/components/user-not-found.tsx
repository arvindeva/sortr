import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Home, Search } from "lucide-react";

interface UserNotFoundProps {
  username?: string;
}

export function UserNotFound({ username }: UserNotFoundProps) {
  return (
    <PageContainer width="narrow">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-6xl md:text-7xl">👤</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          User Not Found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {username
            ? `The user "${username}" doesn't exist or hasn't created an account yet.`
            : "The user you're looking for doesn't exist or hasn't created an account yet."}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Check the username spelling, or explore other users' sorters.
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
