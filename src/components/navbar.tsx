"use client";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ["user", session?.user?.email],
    queryFn: async () => {
      if (!session?.user?.email) return null;
      const response = await fetch(
        `/api/user?email=${encodeURIComponent(session.user.email)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!session?.user?.email,
  });

  return (
    <nav className="bg-card sticky top-0 z-30 flex w-full items-center justify-between border-b px-6 py-4">
      <Link
        href="/"
        className="hover:text-primary text-3xl font-bold tracking-wide transition-all duration-300 ease-out hover:scale-105 hover:tracking-wider hover:drop-shadow-sm"
      >
        sortr
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden items-center gap-2 md:flex">
        {/* Create button - always visible */}
        {status === "loading" ? (
          <Button size="sm" variant="default" disabled>
            <Plus className="mr-1" size={16} />
            Create a Sorter
          </Button>
        ) : session ? (
          <Link href="/create">
            <Button
              size="sm"
              variant="default"
              className="group transition-transform duration-200 hover:scale-105"
            >
              <Plus
                className="mr-1 transition-transform duration-200 group-hover:rotate-90"
                size={16}
              />
              Create a Sorter
            </Button>
          </Link>
        ) : (
          <Link href="/auth/signin">
            <Button
              size="sm"
              variant="default"
              className="group transition-transform duration-200 hover:scale-105"
            >
              <Plus
                className="mr-1 transition-transform duration-200 group-hover:rotate-90"
                size={16}
              />
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

      {/* Mobile Menu Button */}
      <div className="flex items-center gap-2 md:hidden">
        <ModeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`bg-card absolute top-full right-0 left-0 z-30 border-b transition-all duration-300 ease-out md:hidden ${mobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}
      >
        <div className="flex flex-col gap-3 p-4">
          {/* Create button */}
          {status === "loading" ? (
            <Button variant="default" disabled className="w-full">
              <Plus className="mr-2" size={16} />
              Create a Sorter
            </Button>
          ) : session ? (
            <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="default" className="w-full">
                <Plus className="mr-2" size={16} />
                Create a Sorter
              </Button>
            </Link>
          ) : (
            <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="default" className="w-full">
                <Plus className="mr-2" size={16} />
                Create a Sorter
              </Button>
            </Link>
          )}

          {/* Auth buttons */}
          {status === "loading" ? (
            <Button variant="ghost" disabled className="w-full">
              Loading...
            </Button>
          ) : session ? (
            <>
              {userData?.username ? (
                <Link
                  href={`/user/${userData.username}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="ghost" className="w-full">
                    Profile
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" disabled className="w-full">
                  Profile
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full"
              >
                Logout
              </Button>
            </>
          ) : (
            <div onClick={() => setMobileMenuOpen(false)}>
              <LoginButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
