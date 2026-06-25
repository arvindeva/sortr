"use client";
import { useSession, signOut, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button";
import { ModeToggle } from "@/components/mode-toggle";
import { SortrLogo } from "@/components/ui/sortr-mark";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Menu, X, Search } from "lucide-react";
import { forwardRef, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Solid bg at the very top, frosted-glass once the page scrolls
  const [scrolled, setScrolled] = useState(false);
  // Portal target only exists after mount (avoids SSR document access)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuFirstButtonRef = useRef<HTMLElement>(null);
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

  // Close the mobile menu on Escape and lock body scroll while it's open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

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
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <Link
        href="/"
        prefetch={false}
        className="group flex items-center transition-opacity hover:opacity-90"
        aria-label="sortr home"
      >
        {/* Two squares facing off — the VS panels at the heart of the app */}
        <SortrLogo />
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
          className="group relative font-medium text-foreground transition-colors hover:text-main-ink"
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
                className="group relative font-medium text-foreground transition-colors hover:text-main-ink"
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

      {/* Mobile bar: just two 42px buttons — ghost search + menu toggle */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileSearchOpen((v) => !v);
            setMobileMenuOpen(false);
          }}
          aria-label="Search"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] border border-foreground/[0.16] text-foreground transition-colors hover:bg-foreground/5"
        >
          <Search size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen((v) => !v);
            setMobileSearchOpen(false);
          }}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[image:var(--main-gradient)] text-main-foreground shadow-[0_6px_18px_rgba(255,46,126,.35)] transition-[filter] hover:brightness-110"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Page dim behind the menu sheet. Portaled to <body> so it isn't trapped
          inside the nav — once scrolled, the nav's backdrop-blur becomes a
          containing block for fixed children, which would otherwise shrink this
          overlay to the nav's box and leave the page undimmed. */}
      {mounted &&
        createPortal(
          <div
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
            className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-200 lg:hidden ${
              mobileMenuOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          />,
          document.body,
        )}

      {/* Menu sheet — opens below the bar with fade + slight translateY */}
      <div
        ref={drawerContentRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`absolute top-full right-0 left-0 z-30 origin-top overflow-hidden border-b border-border bg-[image:var(--menu-sheet-bg)] transition-all duration-[220ms] ease-out lg:hidden ${
          mobileMenuOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-[10px] opacity-0"
        }`}
      >
        {/* faint 48px grid on the panel — tracks the active theme */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--atmo-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--atmo-grid-line) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex flex-col gap-5 p-5">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sorters…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[50px] rounded-[10px] pr-4 pl-11 text-base"
            />
          </form>

          {/* Nav as a vertical list */}
          <nav className="flex flex-col">
            <MobileNavRow
              ref={mobileMenuFirstButtonRef}
              href="/browse"
              onSelect={() => setMobileMenuOpen(false)}
            >
              Browse
            </MobileNavRow>

            {status === "loading" ? null : session ? (
              <>
                {userData?.username && (
                  <MobileNavRow
                    href={`/user/${userData.username}`}
                    onSelect={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </MobileNavRow>
                )}
                <MobileNavRow
                  muted
                  onSelect={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                >
                  Log out
                </MobileNavRow>
              </>
            ) : (
              <MobileNavRow
                onSelect={() => {
                  setMobileMenuOpen(false);
                  signIn();
                }}
              >
                Log in
              </MobileNavRow>
            )}
          </nav>

          {/* Single primary CTA */}
          <Button
            asChild
            arcade
            size="lg"
            className="w-full"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Link href={session ? "/create" : "/auth/signin"}>
              + Create a sorter
            </Link>
          </Button>

          {/* Theme toggle pinned at the bottom */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="hud text-xs text-muted-foreground">Theme</span>
            <ModeToggle />
          </div>
        </div>
      </div>

      {/* Mobile Search dropdown (the ghost search button) */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileSearchOpen(false)}
        />
      )}
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

/**
 * A row in the mobile menu sheet: a big Big Shoulders uppercase label with a
 * trailing ▸ and a bottom hairline. Renders as a Link when `href` is given,
 * otherwise a button that runs `onSelect` (used for sign in / out). `muted`
 * dims it (Log out).
 */
const MobileNavRow = forwardRef<
  HTMLElement,
  {
    href?: string;
    onSelect?: () => void;
    muted?: boolean;
    children: React.ReactNode;
  }
>(function MobileNavRow({ href, onSelect, muted, children }, ref) {
  const className = `group flex items-center justify-between border-b border-border py-4 text-left font-heading text-[26px] font-extrabold uppercase tracking-[0.01em] transition-colors ${
    muted ? "text-muted-foreground" : "text-foreground"
  } hover:text-main-ink`;
  const arrow = (
    <span className="text-main transition-transform duration-200 group-hover:translate-x-1">
      ▸
    </span>
  );

  if (href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={onSelect}
        className={className}
      >
        <span>{children}</span>
        {arrow}
      </Link>
    );
  }
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onSelect}
      className={className}
    >
      <span>{children}</span>
      {arrow}
    </button>
  );
});
