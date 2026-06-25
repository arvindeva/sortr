"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/page-container";
import { ArcadePageHeader } from "@/components/ui/arcade-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";

interface BrowseResult {
  sorters: Array<{
    id: string;
    title: string;
    slug: string;
    description?: string;
    category?: string;
    completionCount: number;
    createdAt: string;
    coverImageUrl?: string;
    creatorUsername: string;
  }>;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  availableCategories: string[];
}

// Static categories from create sorter form
const CATEGORIES = [
  "Movies & TV",
  "Music",
  "Video Games",
  "Books",
  "Food",
  "Sports",
  "Fashion",
  "Academics",
  "Anime & Manga",
  "Tech",
  "Internet",
  "Travel",
  "Nature",
  "Hobbies",
  "Vehicles",
  "Other",
];

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current filters from URL
  const query = searchParams.get("q") || "";
  const categoriesParam = searchParams.get("categories") || "";
  const selectedCategories = categoriesParam
    ? categoriesParam.split(",").filter(Boolean)
    : [];
  const sort = searchParams.get("sort") || "popular";
  const page = parseInt(searchParams.get("page") || "1");

  // Local state for search input (for debouncing)
  const [searchInput, setSearchInput] = useState(query);
  // Category chips are collapsed by default on mobile (they take a lot of space)
  const [showFilters, setShowFilters] = useState(false);

  // Update search input when URL changes
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== query) {
        updateFilters({ q: searchInput, page: 1 });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, query]);

  // Function to update URL with new filters
  const updateFilters = useCallback(
    (updates: Record<string, any>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            params.delete(key);
          } else {
            params.set(key, value.join(","));
          }
        } else {
          params.set(key, value.toString());
        }
      });

      router.push(`/browse?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Fetch browse results
  const { data, isLoading, error } = useQuery<BrowseResult>({
    queryKey: ["browse", query, categoriesParam, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(query && { q: query }),
        ...(categoriesParam && { categories: categoriesParam }),
        sort,
        page: page.toString(),
        limit: "20",
      });

      const response = await fetch(`/api/browse?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sorters");
      }
      return response.json();
    },
  });

  // Handle category toggle
  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    updateFilters({ categories: newCategories, page: 1 });
  };

  // Handle clear all categories
  const clearCategories = () => {
    updateFilters({ categories: [], page: 1 });
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    updateFilters({ sort: newSort, page: 1 });
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  return (
    <PageContainer>
      {/* Page Header */}
      <ArcadePageHeader
        className="mb-7"
        eyebrow={
          data
            ? `${data.totalCount.toLocaleString()} sorters live — pick your fight`
            : "pick your fight"
        }
        title="Browse sorters"
      />

      {/* Search Bar */}
      <div className="mb-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sorters by title or creator…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-[52px] rounded-[10px] pr-11 pl-12 text-base"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="mb-6">
        {/* Mobile toggle — chips collapse by default to save space */}
        <Button
          variant="neutral"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="mb-3 flex w-full items-center justify-between lg:hidden"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filter by category
            {selectedCategories.length > 0 && (
              <Badge variant="default" className="h-5">
                {selectedCategories.length}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </Button>

        {/* Chips: collapsible on mobile, always shown on desktop. Mono pills;
            active = magenta fill, idle = bordered surface. */}
        <div
          className={`${showFilters ? "flex" : "hidden"} flex-wrap gap-2 lg:flex`}
        >
          <button
            onClick={clearCategories}
            disabled={selectedCategories.length === 0}
            className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            Clear all
          </button>
          {CATEGORIES.map((category) => {
            const active = selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-[13px] transition-colors ${
                  active
                    ? "border-main bg-main text-main-foreground"
                    : "border-border bg-muted text-foreground hover:border-main/50 hover:text-main-ink"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort and Results Info */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="hud text-xs text-muted-foreground">Sort by</span>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most played</SelectItem>
              <SelectItem value="recent">Most recent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <span className="font-mono text-[13px] text-muted-foreground">
            Showing {Math.min((page - 1) * 20 + 1, data.totalCount)}–
            {Math.min(page * 20, data.totalCount)} of{" "}
            {data.totalCount.toLocaleString()}
          </span>
        )}
      </div>

      <div className="mb-7 h-px bg-border" />

      {/* Results */}
      <section>
        <div>
            {isLoading ? (
              <div className="py-12 text-center">
                <div className="mb-4">
                  <Spinner size={32} />
                </div>
                <p className="text-lg font-medium">Loading sorters...</p>
              </div>
            ) : error ? (
              <EmptyState
                variant="error"
                title="Error loading sorters."
                description="Please try again."
              />
            ) : !data || data.sorters.length === 0 ? (
              <EmptyState
                title="No sorters found."
                description="Try adjusting your search or filter criteria."
              />
            ) : (
              <>
                {/* Results Grid */}
                <SorterGrid>
                  {data.sorters.map((sorter) => (
                    <SorterCard key={sorter.id} sorter={sorter} showCategory />
                  ))}
                </SorterGrid>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!data.hasPrevPage}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from(
                          { length: Math.min(5, data.totalPages) },
                          (_, i) => {
                            const pageNum =
                              Math.max(
                                1,
                                Math.min(data.totalPages - 4, page - 2),
                              ) + i;
                            if (pageNum > data.totalPages) return null;

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  pageNum === page ? "default" : "neutral"
                                }
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-9 px-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          },
                        )}
                      </div>

                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!data.hasNextPage}
                        aria-label="Next page"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </section>
    </PageContainer>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <ArcadePageHeader
            className="mb-7"
            eyebrow="pick your fight"
            title="Browse sorters"
          />
          <div className="py-12 text-center">
            <p className="font-mono text-sm text-muted-foreground">Loading…</p>
          </div>
        </PageContainer>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
