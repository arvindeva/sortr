import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Home, Search, Users } from "lucide-react";

interface UserNotFoundProps {
  username?: string;
}

export function UserNotFound({ username }: UserNotFoundProps) {
  return (
    <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-2xl px-2 py-10 md:px-4">
      <div className="flex min-h-[60vh] items-center justify-center">
        <Panel variant="primary" className="w-full">
          <PanelHeader variant="primary">
            <PanelTitle>User Not Found</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-6 text-center">
            <div className="mb-6">
              <div className="text-5xl font-extrabold text-foreground mb-4">
                👤
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
              <p className="text-foreground mb-2">
                {username 
                  ? `The user "${username}" doesn't exist or hasn't created an account yet.`
                  : "The user you're looking for doesn't exist or hasn't created an account yet."
                }
              </p>
              <p className="text-sm text-foreground">
                Check the username spelling, or explore other users' sorters.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
          </PanelContent>
        </Panel>
      </div>
    </main>
  );
}