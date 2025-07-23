"use client";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LoginButton } from "@/components/login-button";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Menu, X, User, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileSearchOpen(false);
    }
  };

  return (
    <nav className="border-border bg-secondary-background sticky top-0 z-30 flex w-full items-center justify-between border-b-2 px-4 py-2 md:px-6 md:py-4">
      <Link href="/">
        <span className="text-2xl font-bold tracking-wide transition-all duration-300 ease-out hover:tracking-widest md:hidden">
          sortr
        </span>
        <Logo
          variant="primary"
          size="sm"
          className="hidden text-2xl font-bold tracking-wide transition-all duration-300 ease-out hover:tracking-widest md:block"
        >
          sortr
        </Logo>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden items-center gap-6 md:flex">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search sorters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9 pr-3"
          />
        </form>

        {/* Create button - always visible */}
        {status === "loading" ? (
          <Button size="sm" variant="default" disabled>
            <Plus className="mr-1" size={16} />
            Create a Sorter
          </Button>
        ) : session ? (
          <Button asChild size="sm" variant="default" className="group">
            <Link href="/create">
              <Plus
                className="mr-1 transition-transform duration-200 group-hover:rotate-90"
                size={16}
              />
              Create a Sorter
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="default" className="group">
            <Link href="/auth/signin">
              <Plus
                className="mr-1 transition-transform duration-200 group-hover:rotate-90"
                size={16}
              />
              Create a Sorter
            </Link>
          </Button>
        )}

        {/* Browse link */}
        <Link
          href="/browse"
          className="sorter-title-link font-medium hover:underline"
        >
          Browse
        </Link>

        {status === "loading" ? (
          <Button size="sm" variant="default" disabled>
            Loading...
          </Button>
        ) : session ? (
          <div className="flex items-center gap-6">
            {userData?.username ? (
              <Link
                href={`/user/${userData.username}`}
                className="sorter-title-link font-medium hover:underline"
              >
                Profile
              </Link>
            ) : (
              <span className="text-muted-foreground font-medium">Profile</span>
            )}
            <ModeToggle />
            <Button size="sm" variant="neutral" onClick={() => signOut()}>
              Logout
            </Button>
          </div>
        ) : (
          <>
            <ModeToggle />
            <LoginButton />
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="flex items-center gap-4 md:hidden">
        {/* Search button - mobile navbar */}
        <Button
          variant="default"
          size="icon"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          aria-label="Search"
        >
          <Search size={20} />
        </Button>

        {/* Create button - mobile navbar */}
        {status === "loading" ? (
          <Button
            variant="default"
            size="icon"
            disabled
            aria-label="Create a Sorter"
          >
            <Plus size={20} />
          </Button>
        ) : session ? (
          <Button
            asChild
            variant="default"
            size="icon"
            aria-label="Create a Sorter"
          >
            <Link href="/create">
              <Plus size={20} />
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="default"
            size="icon"
            aria-label="Create a Sorter"
          >
            <Link href="/auth/signin">
              <Plus size={20} />
            </Link>
          </Button>
        )}
        <ModeToggle />
        <Button
          variant="default"
          size="icon"
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

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileSearchOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`border-border bg-secondary-background absolute top-full right-0 left-0 z-30 border-b-2 transition-all duration-300 ease-out md:hidden ${mobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}
      >
        <div className="flex flex-col gap-3 p-4">
          {/* Browse link */}
          <Button asChild variant="default" className="w-full">
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)}>
              Browse
            </Link>
          </Button>

          {/* Auth buttons */}
          {status === "loading" ? (
            <Button variant="default" disabled className="w-full">
              Loading...
            </Button>
          ) : session ? (
            <>
              {userData?.username ? (
                <Button asChild variant="default" className="w-full">
                  <Link
                    href={`/user/${userData.username}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Link>
                </Button>
              ) : (
                <Button variant="default" disabled className="w-full">
                  <User size={16} className="mr-2" />
                  Profile
                </Button>
              )}
              <Button
                variant="default"
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

      {/* Mobile Search Input */}
      <div
        className={`border-border bg-secondary-background absolute top-full right-0 left-0 z-30 border-b-2 transition-all duration-300 ease-out md:hidden ${mobileSearchOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}
      >
        <div className="p-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search sorters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3"
                autoFocus={mobileSearchOpen}
              />
            </div>
            <Button 
              type="submit" 
              variant="default" 
              size="sm" 
              className="w-full"
              disabled={!searchQuery.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
