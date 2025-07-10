"use client"
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

export function Navbar() {
  const { data: session, status } = useSession();

  const { data: userData } = useQuery({
    queryKey: ["user", session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null;
      const response = await fetch(`/api/user?email=${encodeURIComponent(session.user.email)}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!session?.user?.email,
  });

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 border-b bg-background/90 sticky top-0 z-30">
      <Link href="/" className="text-3xl font-bold tracking-tight hover:opacity-80 transition-opacity">
        sortr.io
      </Link>
      <div className="flex items-center gap-2">
        {/* Create button - always visible */}
        {status === "loading" ? (
          <Button size="sm" variant="default" disabled>
            Create a Sorter
          </Button>
        ) : session ? (
          <Link href="/create">
            <Button size="sm" variant="default">
              Create a Sorter
            </Button>
          </Link>
        ) : (
          <Link href="/auth/signin">
            <Button size="sm" variant="default">
              Create a Sorter
            </Button>
          </Link>
        )}
        
        {status === "loading" ? (
          <Button size="sm" variant="ghost" disabled>
            Loading...
          </Button>
        ) : session ? (
          <div className="flex items-center gap-2">
            {userData?.username ? (
              <Link href={`/user/${userData.username}`}>
                <Button size="sm" variant="ghost">
                  Profile
                </Button>
              </Link>
            ) : (
              <Button size="sm" variant="ghost" disabled>
                Profile
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => signOut()}>
              Logout
            </Button>
          </div>
        ) : (
          <LoginButton />
        )}
        <ModeToggle />
      </div>
    </nav>
  );
}
