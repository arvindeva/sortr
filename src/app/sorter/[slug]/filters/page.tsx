"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeft, Filter, Play } from "lucide-react";
import Link from "next/link";

interface FilterPageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  items: {
    id: string;
    title: string;
    imageUrl?: string;
  }[];
}

interface Sorter {
  id: string;
  title: string;
  description?: string;
  slug: string;
}

interface ApiResponse {
  sorter: Sorter;
  tags: Tag[];
  items: any[];
}

export default function FilterPage({ params }: FilterPageProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [isTagsInitialized, setIsTagsInitialized] = useState(false);

  // Get slug from params
  useEffect(() => {
    const getSlug = async () => {
      const { slug } = await params;
      setCurrentSlug(slug);
    };
    getSlug();
  }, [params]);

  // Fetch sorter data with TanStack Query
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["sorter", currentSlug],
    queryFn: async () => {
      if (!currentSlug) throw new Error("No slug provided");

      const response = await fetch(`/api/sorters/${currentSlug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sorter data");
      }
      return response.json();
    },
    enabled: !!currentSlug,
  });

  // Handle redirect and initialize selected tags
  useEffect(() => {
    if (data) {
      // If no tags exist, redirect directly to sort
      if (!data.tags || data.tags.length === 0) {
        router.push(`/sorter/${currentSlug}/sort`);
        return;
      }

      // Select all tags by default (only on first load)
      if (!isTagsInitialized) {
        setSelectedTags(data.tags.map((tag) => tag.slug));
        setIsTagsInitialized(true);
      }
    }
  }, [data, currentSlug, router, isTagsInitialized]);

  const toggleTag = (tagSlug: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagSlug)
        ? prev.filter((slug) => slug !== tagSlug)
        : [...prev, tagSlug],
    );
  };

  const handleStartSorting = () => {
    if (selectedTags.length === 0) {
      alert("Please select at least one tag to sort");
      return;
    }

    // Navigate to sort page with selected tags as URL parameters
    const tagsParam = selectedTags.join(",");
    router.push(`/sorter/${currentSlug}/sort?tags=${tagsParam}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="text-center">
          <h1 className="mb-3 animate-pulse text-2xl font-bold">
            Loading filters...
          </h1>
          <div className="mb-6">
            <Spinner size={32} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
        <div className="py-12 text-center">
          <p className="mb-4 text-red-600">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Sorter not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Destructure data for easier access
  const { sorter, tags } = data;

  // Calculate unique items across selected tags
  const totalItems = (() => {
    if (selectedTags.length === 0) return 0;

    const uniqueItemIds = new Set<string>();
    selectedTags.forEach((tagSlug) => {
      const tag = tags.find((t) => t.slug === tagSlug);
      if (tag) {
        tag.items.forEach((item) => {
          uniqueItemIds.add(item.id);
        });
      }
    });

    return uniqueItemIds.size;
  })();

  return (
    <div className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <Button asChild variant="noShadow" size="sm">
            <Link href={`/sorter/${sorter.slug}`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Sorter
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Panel */}
      <Panel variant="primary">
        <PanelHeader variant="primary">
          <PanelTitle>Filters</PanelTitle>
        </PanelHeader>
        <PanelContent variant="primary" className="p-2 md:p-6">
          <div className="mb-6">
            <p className="text-foreground mb-4">
              This sorter has filters. Choose which tags you want to include in
              your sorting session for "{sorter.title}"
            </p>

            {/* Stats */}
            <div className="text-muted-foreground flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>
                  {selectedTags.length} of {tags.length} tags selected
                </span>
              </div>
              <div>
                <span>{totalItems} items total</span>
              </div>
            </div>
          </div>

          {/* Tags Selection */}
          <div className="mb-8">
            <div className="space-y-4">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.slug);

                return (
                  <div key={tag.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      className="border-foreground cursor-pointer"
                      checked={isSelected}
                      onCheckedChange={() => toggleTag(tag.slug)}
                    />
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="cursor-pointer font-medium"
                    >
                      {tag.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4 flex gap-2">
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setSelectedTags(tags.map((t) => t.slug))}
            >
              Select All
            </Button>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setSelectedTags([])}
            >
              Clear All
            </Button>
          </div>

          {selectedTags.length === 0 && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-yellow-800">
                Please select at least one tag to start sorting.
              </p>
            </div>
          )}

          {/* Start Sorting Button */}
          <Button
            onClick={handleStartSorting}
            disabled={selectedTags.length === 0}
            size="lg"
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Sorting ({totalItems} items)
          </Button>
        </PanelContent>
      </Panel>
    </div>
  );
}
