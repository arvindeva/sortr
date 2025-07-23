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
import { SortingBarsLoader } from "@/components/ui/sorting-bars-loader";
import { ChevronLeft, Filter, Play } from "lucide-react";
import Link from "next/link";

interface FilterPageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface Group {
  id: string;
  name: string;
  slug: string;
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
  useGroups: boolean;
}

interface ApiResponse {
  sorter: Sorter;
  groups: Group[];
  items: any[];
}

export default function FilterPage({ params }: FilterPageProps) {
  const router = useRouter();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [isGroupsInitialized, setIsGroupsInitialized] = useState(false);

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

  // Handle redirect and initialize selected groups
  useEffect(() => {
    if (data) {
      if (!data.sorter.useGroups) {
        router.push(`/sorter/${currentSlug}/sort`);
        return;
      }

      // Select all groups by default (only on first load)
      if (!isGroupsInitialized) {
        setSelectedGroups(data.groups.map((group) => group.slug));
        setIsGroupsInitialized(true);
      }
    }
  }, [data, currentSlug, router, isGroupsInitialized]);

  const toggleGroup = (groupSlug: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupSlug)
        ? prev.filter((slug) => slug !== groupSlug)
        : [...prev, groupSlug],
    );
  };

  const toggleExpanded = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const handleStartSorting = () => {
    if (selectedGroups.length === 0) {
      alert("Please select at least one group to sort");
      return;
    }

    // Navigate to sort page with selected groups as URL parameters
    const groupsParam = selectedGroups.join(",");
    router.push(`/sorter/${currentSlug}/sort?groups=${groupsParam}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="mb-3 animate-pulse text-2xl font-bold">
            Loading filters...
          </h1>
          <SortingBarsLoader className="mb-6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
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
      <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Sorter not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Destructure data for easier access
  const { sorter, groups } = data;

  const totalItems = selectedGroups.reduce((total, groupSlug) => {
    const group = groups.find((g) => g.slug === groupSlug);
    return total + (group?.items.length || 0);
  }, 0);

  return (
    <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
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
              This sorter has filters. Choose which groups you want to include
              in your sorting session for "{sorter.title}"
            </p>

            {/* Stats */}
            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <span>
                  {selectedGroups.length} of {groups.length} groups selected
                </span>
              </div>
              <div>
                <span>{totalItems} items total</span>
              </div>
            </div>
          </div>

          {/* Groups Selection */}
          <div className="mb-8">
            <div className="space-y-4">
              {groups.map((group) => {
                const isSelected = selectedGroups.includes(group.slug);
                const isExpanded = expandedGroups.includes(group.id);

                return (
                  <div key={group.id} className="space-y-2">
                    {/* Group Row */}
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`group-${group.id}`}
                        className="border-foreground cursor-pointer"
                        checked={isSelected}
                        onCheckedChange={() => toggleGroup(group.slug)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="cursor-pointer font-medium"
                      >
                        {group.name}
                      </label>
                      <button
                        onClick={() => toggleExpanded(group.id)}
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {isExpanded
                          ? `Hide ${group.items.length} items`
                          : `Show ${group.items.length} items`}
                      </button>
                    </div>

                    {/* Expandable Items List */}
                    {isExpanded && (
                      <div className="ml-6 space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-foreground truncate">
                              {item.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
              onClick={() => setSelectedGroups(groups.map((g) => g.slug))}
            >
              Select All
            </Button>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setSelectedGroups([])}
            >
              Clear All
            </Button>
          </div>

          {selectedGroups.length === 0 && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                Please select at least one group to start sorting.
              </p>
            </div>
          )}

          {/* Start Sorting Button */}
          <Button
            onClick={handleStartSorting}
            disabled={selectedGroups.length === 0}
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
