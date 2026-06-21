"use client";
import { useSession, signOut, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button";
import { ModeToggle } from "@/components/mode-toggle";
import { SortrMark } from "@/components/ui/sortr-mark";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Menu, X, User, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
} from "@/components/ui/drawer";

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Solid bg at the very top, frosted-glass once the page scrolls
  const [scrolled, setScrolled] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuFirstButtonRef = useRef<HTMLButtonElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);

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

  // Press "/" anywhere to jump to the desktop search box
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      // Don't hijack the key while the user is typing in a field
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const input = desktopSearchInputRef.current;
      if (input) {
        e.preventDefault();
        input.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Toggle the frosted-glass navbar background after a little scroll
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll(); // sync initial state (e.g. on refresh mid-page)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Focus mobile search input when search opens
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      // Small delay to ensure the element is visible and ready for focus
      const timeoutId = setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [mobileSearchOpen]);

  // Focus management for mobile menu drawer
  useEffect(() => {
    if (mobileMenuOpen) {
      // Wait for drawer to finish its setup, then check if focus is already managed
      const timeoutId = setTimeout(() => {
        // Only focus if nothing in the drawer is already focused
        const activeElement = document.activeElement;
        const drawerContainer = drawerContentRef.current;

        if (drawerContainer && !drawerContainer.contains(activeElement)) {
          // Try focusing the first button, then fallback to container
          if (mobileMenuFirstButtonRef.current) {
            mobileMenuFirstButtonRef.current.focus();
          } else if (drawerContentRef.current) {
            drawerContentRef.current.focus();
          }
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [mobileMenuOpen]);

  // Close mobile menu when clicking outside (handled by overlay click)
  // No need for document click listener since overlay handles it

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileSearchOpen(false);
    }
  };

  return (
    <nav
      className={`sticky top-0 z-30 flex w-full items-center justify-between border-b px-4 py-3 transition-colors duration-200 md:px-6 md:py-4 ${
        scrolled
          ? "border-border bg-background/70 backdrop-blur-lg"
          : "border-transparent bg-background"
      }`}
    >
      <Link
        href="/"
        prefetch={false}
        className="group flex items-center gap-2"
      >
        {/* Two squares facing off — the duel at the heart of the app */}
        <SortrMark size={26} animate />
        <span className="text-2xl font-bold tracking-tight transition-colors group-hover:text-main">
          sortr
        </span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden items-center gap-6 lg:flex">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            ref={desktopSearchInputRef}
            placeholder="Search sorters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pr-9 pl-9"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground xl:inline-flex">
            /
          </kbd>
        </form>

        {/* Create button - always visible */}
        {status === "loading" ? (
          <Button variant="default" disabled>
            <Plus size={16} />
            Create a Sorter
          </Button>
        ) : session ? (
          <Button asChild variant="default" className="group">
            <Link href="/create">
              <Plus
                className="transition-transform duration-200 group-hover:rotate-90"
                size={16}
              />
              Create a Sorter
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default" className="group">
            <Link href="/auth/signin">
              <Plus
                className="transition-transform duration-200 group-hover:rotate-90"
                size={16}
              />
              Create a Sorter
            </Link>
          </Button>
        )}

        {/* Browse link */}
        <Link
          href="/browse"
          className="group relative font-medium text-foreground transition-colors hover:text-main"
        >
          Browse
          <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-main transition-transform duration-200 ease-out group-hover:scale-x-100" />
        </Link>

        {status === "loading" ? (
          <Button variant="default" disabled>
            Loading...
          </Button>
        ) : session ? (
          <div className="flex items-center gap-6">
            {userData?.username ? (
              <Link
                href={`/user/${userData.username}`}
                className="group relative font-medium text-foreground transition-colors hover:text-main"
              >
                Profile
                <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-main transition-transform duration-200 ease-out group-hover:scale-x-100" />
              </Link>
            ) : (
              <span className="font-medium text-muted-foreground">Profile</span>
            )}
            <Button variant="neutral" onClick={() => signOut()}>
              Logout
            </Button>
            <ModeToggle />
          </div>
        ) : (
          <>
            <LoginButton />
            <ModeToggle />
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="flex items-center gap-4 lg:hidden">
        {/* Search button - mobile navbar */}
        <Button
          variant="default"
          size="icon"
          onClick={() => {
            setMobileSearchOpen(!mobileSearchOpen);
            setMobileMenuOpen(false);
          }}
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
            onClick={() => setMobileMenuOpen(false)}
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
            onClick={() => setMobileMenuOpen(false)}
          >
            <Link href="/auth/signin">
              <Plus size={20} />
            </Link>
          </Button>
        )}
        <ModeToggle />
        <Drawer
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          direction="top"
        >
          <DrawerTrigger asChild>
            <Button variant="default" size="icon" aria-label="Toggle menu">
              <Menu size={20} />
            </Button>
          </DrawerTrigger>

          <DrawerContent className="lg:hidden">
            <DrawerTitle className="sr-only">Navigation Menu</DrawerTitle>
            <DrawerDescription className="sr-only">
              Choose a navigation option from the list below
            </DrawerDescription>

            {/* Simplified navbar inside drawer */}
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
              <Link
                href="/"
                prefetch={false}
                className="flex items-center gap-2"
              >
                <SortrMark size={26} />
                <span className="text-2xl font-bold tracking-tight">sortr</span>
              </Link>
              <DrawerClose asChild>
                <Button variant="default" size="icon" aria-label="Close menu">
                  <X size={20} />
                </Button>
              </DrawerClose>
            </div>

            <div
              ref={drawerContentRef}
              className="flex flex-col gap-3 p-4"
              tabIndex={-1}
            >
              {/* Browse link */}
              <DrawerClose asChild>
                <Button
                  ref={mobileMenuFirstButtonRef}
                  asChild
                  variant="default"
                  className="w-full"
                >
                  <Link href="/browse">Browse</Link>
                </Button>
              </DrawerClose>

              {/* Auth buttons */}
              {status === "loading" ? (
                <Button variant="default" disabled className="w-full">
                  Loading...
                </Button>
              ) : session ? (
                <>
                  {userData?.username ? (
                    <DrawerClose asChild>
                      <Button asChild variant="default" className="w-full">
                        <Link href={`/user/${userData.username}`}>Profile</Link>
                      </Button>
                    </DrawerClose>
                  ) : (
                    <Button variant="default" disabled className="w-full">
                      <User size={16} className="mr-2" />
                      Profile
                    </Button>
                  )}
                  <DrawerClose asChild>
                    <Button
                      variant="neutral"
                      onClick={() => signOut()}
                      className="w-full"
                    >
                      Logout
                    </Button>
                  </DrawerClose>
                </>
              ) : (
                <DrawerClose asChild>
                  <div>
                    <LoginButton className="w-full" />
                  </div>
                </DrawerClose>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileSearchOpen(false)}
        />
      )}

      {/* Mobile Search Input */}
      <div
        className={`absolute top-full right-0 left-0 z-30 border-b border-border bg-background/95 backdrop-blur-lg transition-all duration-300 ease-out lg:hidden ${mobileSearchOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}
      >
        <div className="p-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                ref={mobileSearchInputRef}
                placeholder="Search sorters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-3 pl-9"
              />
            </div>
            <Button
              type="submit"
              variant="default"
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
