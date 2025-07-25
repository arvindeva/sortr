"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SortingBarsLoader } from "@/components/ui/sorting-bars-loader";
import { PageHeader } from "@/components/ui/page-header";
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
    viewCount: number;
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
    <main className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
      {/* Page Header */}
      <Box variant="primary" size="md" className="mb-6 block">
        <PageHeader>Browse Sorters</PageHeader>
      </Box>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search sorters by title, creator, or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pr-10 pl-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="neutral"
            size="sm"
            onClick={clearCategories}
            className="h-6"
            disabled={selectedCategories.length === 0}
          >
            Clear All
          </Button>
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={
                selectedCategories.includes(category) ? "default" : "neutral"
              }
              className="flex h-6 cursor-pointer items-center transition-opacity hover:opacity-80"
              onClick={() => toggleCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sort and Results Info */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Sort by:</span>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {data && (
          <div className="text-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, data.totalCount)}{" "}
            of {data.totalCount} sorters
          </div>
        )}
      </div>

      {/* Results */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>
              {query ? `Search Results for "${query}"` : "All Sorters"}
              {data && ` (${data.totalCount})`}
            </PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {isLoading ? (
              <div className="text-center">
                <div className="mb-4">
                  <SortingBarsLoader />
                </div>
                <Box variant="neutral" size="md">
                  <p className="font-medium">Loading sorters...</p>
                </Box>
              </div>
            ) : error ? (
              <div className="text-center">
                <Box variant="warning" size="md">
                  <p className="font-medium">
                    Error loading sorters. Please try again.
                  </p>
                </Box>
              </div>
            ) : !data || data.sorters.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="md">
                  <p className="mb-2 font-medium">No sorters found.</p>
                  <p>Try adjusting your search or filter criteria.</p>
                </Box>
              </div>
            ) : (
              <>
                {/* Results Grid */}
                <SorterGrid>
                  {data.sorters.map((sorter) => (
                    <SorterCard key={sorter.id} sorter={sorter} />
                  ))}
                </SorterGrid>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="neutral"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!data.hasPrevPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
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
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </PanelContent>
        </Panel>
      </section>
    </main>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
          <Box variant="primary" size="md" className="mb-6 block">
            <PageHeader>Browse Sorters</PageHeader>
          </Box>
          <div className="text-center">
            <Box variant="neutral" size="md">
              <p className="font-medium">Loading...</p>
            </Box>
          </div>
        </main>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
