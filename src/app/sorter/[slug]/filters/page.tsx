"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  Filter,
  Play,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
  const [sorter, setSorter] = useState<Sorter | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { slug } = await params;
        setCurrentSlug(slug);
        const response = await fetch(`/api/sorters/${slug}`);

        if (!response.ok) {
          throw new Error("Failed to fetch sorter data");
        }

        const data: ApiResponse = await response.json();

        if (!data.sorter.useGroups) {
          // Redirect to sort page if not using groups
          router.push(`/sorter/${slug}/sort`);
          return;
        }

        setSorter(data.sorter);
        setGroups(data.groups);

        // Select all groups by default
        setSelectedGroups(data.groups.map((group) => group.slug));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

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
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground">Loading filters...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="py-12 text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!sorter) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Sorter not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const totalItems = selectedGroups.reduce((total, groupSlug) => {
    const group = groups.find((g) => g.slug === groupSlug);
    return total + (group?.items.length || 0);
  }, 0);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <Link href={`/sorter/${sorter.slug}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Sorter
            </Button>
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="mb-2 text-2xl font-bold">Start Sorting</h1>
          <p className="text-muted-foreground">
            Choose which groups you want to include in your sorting session for
            "{sorter.title}"
          </p>
        </div>

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
                        {item.imageUrl ? (
                          <div className="bg-muted h-6 w-6 flex-shrink-0 overflow-hidden rounded">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                            <span className="text-muted-foreground text-xs font-bold">
                              {item.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-muted-foreground truncate">
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
      {selectedGroups.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            Please select at least one group to start sorting.
          </p>
        </div>
      )}
      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-4">
        <Button
          onClick={handleStartSorting}
          disabled={selectedGroups.length === 0}
          size="lg"
          className="max-w-md flex-1"
        >
          <Play className="mr-2 h-4 w-4" />
          Start Sorting ({totalItems} items)
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedGroups(groups.map((g) => g.slug))}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedGroups([])}
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}
