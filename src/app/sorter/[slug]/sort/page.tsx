"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ComparisonCard } from "@/components/ui/comparison-card";
import { ArrowLeft, Trophy, Undo2, RotateCcw } from "lucide-react";
import { SortItem } from "@/lib/sorting";
import { InteractiveMergeSort, SortState } from "@/lib/interactive-merge-sort";
import LZString from "lz-string";
import { Box } from "@/components/ui/box";
import { SortPageSkeleton } from "@/components/sort-page-skeleton";
import { SortingBarsLoader } from "@/components/ui/sorting-bars-loader";

interface SorterData {
  sorter: {
    id: string;
    title: string;
    description: string;
    slug: string;
    useGroups: boolean;
  };
  items: SortItem[];
  groups?: {
    id: string;
    name: string;
    slug: string;
    items: SortItem[];
  }[];
}

interface ComparisonState {
  itemA: SortItem;
  itemB: SortItem;
}

async function fetchSorterData(sorterSlug: string): Promise<SorterData> {
  const response = await fetch(`/api/sorters/${sorterSlug}`);
  if (!response.ok) throw new Error("Failed to fetch sorter");
  return response.json();
}

// Generate localStorage key based on sorter ID and selected groups
function generateProgressKey(sorterId: string, groupSlugs: string[]): string {
  if (groupSlugs.length === 0) {
    return `sorting-progress-${sorterId}-all`;
  }

  // Sort slugs for consistent key generation
  const sortedSlugs = groupSlugs.sort().join("-");
  return `sorting-progress-${sorterId}-${sortedSlugs}`;
}

// Storage optimization: Convert UUID-based choices to indexed format
function serializeChoices(
  items: SortItem[],
  userChoices: Map<string, string>,
  stateHistory: any[],
): any {
  // Create item map for UUID to index conversion
  const itemMap = items.map((item) => item.id);
  const itemToIndex = new Map(itemMap.map((id, index) => [id, index]));

  // Convert user choices to indexed format
  const choices: number[][] = [];
  for (const [key, winnerId] of userChoices.entries()) {
    const [id1, id2] = key.split(",");
    const index1 = itemToIndex.get(id1);
    const index2 = itemToIndex.get(id2);
    const winnerIndex = itemToIndex.get(winnerId);

    if (
      index1 !== undefined &&
      index2 !== undefined &&
      winnerIndex !== undefined
    ) {
      choices.push([index1, index2, winnerIndex]);
    }
  }

  // Convert state history to indexed format
  const historyChoices = stateHistory.map((state) => {
    const stateChoices: number[][] = [];
    for (const [key, winnerId] of state.userChoices.entries()) {
      const [id1, id2] = key.split(",");
      const index1 = itemToIndex.get(id1);
      const index2 = itemToIndex.get(id2);
      const winnerIndex = itemToIndex.get(winnerId);

      if (
        index1 !== undefined &&
        index2 !== undefined &&
        winnerIndex !== undefined
      ) {
        stateChoices.push([index1, index2, winnerIndex]);
      }
    }
    return {
      choices: stateChoices,
      comparisonCount: state.comparisonCount,
    };
  });

  return {
    itemMap,
    choices,
    historyChoices,
  };
}

// Convert indexed format back to UUID-based choices
function deserializeChoices(serializedData: any): {
  userChoices: Map<string, string>;
  stateHistory: any[];
} {
  const { itemMap, choices, historyChoices } = serializedData;

  // Reconstruct user choices map
  const userChoices = new Map<string, string>();
  for (const [index1, index2, winnerIndex] of choices) {
    const id1 = itemMap[index1];
    const id2 = itemMap[index2];
    const winnerId = itemMap[winnerIndex];

    if (id1 && id2 && winnerId) {
      const key = [id1, id2].sort().join(",");
      userChoices.set(key, winnerId);
    }
  }

  // Reconstruct state history
  const stateHistory = historyChoices.map((historyState: any) => {
    const stateChoices = new Map<string, string>();
    for (const [index1, index2, winnerIndex] of historyState.choices) {
      const id1 = itemMap[index1];
      const id2 = itemMap[index2];
      const winnerId = itemMap[winnerIndex];

      if (id1 && id2 && winnerId) {
        const key = [id1, id2].sort().join(",");
        stateChoices.set(key, winnerId);
      }
    }
    return {
      userChoices: stateChoices,
      comparisonCount: historyState.comparisonCount,
    };
  });

  return { userChoices, stateHistory };
}

export default function SortPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sorterSlug = params.slug as string;

  const [currentComparison, setCurrentComparison] =
    useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [filteredItems, setFilteredItems] = useState<SortItem[]>([]);
  const [currentGroupSlugs, setCurrentGroupSlugs] = useState<string[]>([]);
  const [sorterId, setSorterId] = useState<string>("");
  const sorterRef = useRef<InteractiveMergeSort | null>(null);
  const resolveComparisonRef = useRef<((winnerId: string) => void) | null>(
    null,
  );
  const isRestartingRef = useRef(false);

  // Fetch sorter data with TanStack Query
  const {
    data: sorterData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sorter", sorterSlug],
    queryFn: () => fetchSorterData(sorterSlug),
    retry: 1,
  });

  // Process filtered items when data loads
  useEffect(() => {
    if (sorterData) {
      let itemsToSort = sorterData.items;
      let groupSlugs: string[] = [];

      // If using groups, filter items based on selected groups from URL
      if (sorterData.sorter.useGroups && sorterData.groups) {
        const groupsParam = searchParams.get("groups");

        if (groupsParam) {
          try {
            const selectedGroupSlugs = groupsParam
              .split(",")
              .filter((slug) => slug.trim());

            // If no groups selected, default to all items
            if (selectedGroupSlugs.length === 0) {
              itemsToSort = sorterData.items;
              groupSlugs = [];
            } else {
              // Filter items to only include those from selected groups
              itemsToSort = sorterData.groups
                .filter((group) => selectedGroupSlugs.includes(group.slug))
                .flatMap((group) => group.items);
              groupSlugs = selectedGroupSlugs;
            }
          } catch (error) {
            console.error("Failed to parse selected groups:", error);
            // On error, default to all items instead of redirecting
            itemsToSort = sorterData.items;
            groupSlugs = [];
          }
        } else {
          // No groups param, default to all items
          itemsToSort = sorterData.items;
          groupSlugs = [];
        }
      }

      setFilteredItems(itemsToSort);
      setCurrentGroupSlugs(groupSlugs);
      setSorterId(sorterData.sorter.id);
    }
  }, [sorterData, router, searchParams]);

  // Initialize sorting when data loads
  useEffect(() => {
    if (
      sorterData &&
      filteredItems.length > 0 &&
      !sorting &&
      !sorterRef.current
    ) {
      // Check for saved progress using group-specific key
      const progressKey = generateProgressKey(sorterId, currentGroupSlugs);
      const savedState = localStorage.getItem(progressKey);
      let savedChoices: Map<string, string> | undefined;
      let savedComparisonCount = 0;
      let savedStateHistory: SortState[] | undefined;

      if (savedState) {
        try {
          // Decompress the saved state
          const decompressed =
            LZString.decompressFromEncodedURIComponent(savedState);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            savedComparisonCount = parsed.completedComparisons || 0;

            // Handle new optimized format
            if (parsed.optimized) {
              const { userChoices, stateHistory } = deserializeChoices(parsed);
              savedChoices = userChoices;
              savedStateHistory = stateHistory;
            } else {
              // Legacy format support
              savedChoices = new Map(parsed.userChoicesArray || []);

              // Restore state history if available
              if (parsed.stateHistoryArray) {
                savedStateHistory = parsed.stateHistoryArray.map(
                  (historyState: any) => ({
                    userChoices: new Map(historyState.userChoicesArray || []),
                    comparisonCount: historyState.comparisonCount || 0,
                  }),
                );
              }
            }

            setCompletedComparisons(savedComparisonCount);
          }
        } catch (error) {
          console.error("Failed to parse saved state:", error);
        }
      }

      sorterRef.current = new InteractiveMergeSort(
        savedChoices,
        savedComparisonCount,
        savedStateHistory,
      );

      // Set up progress tracking
      sorterRef.current.setProgressCallback((completed, total) => {
        // Small delay to ensure DOM is ready for animation
        setTimeout(() => {
          setCompletedComparisons(completed);
          setTotalComparisons(total);
          setCanUndo(sorterRef.current?.canUndo() || false);
        }, 100);
      });

      // Set up save callback
      sorterRef.current.setSaveCallback(() => {
        if (sorterRef.current) {
          // Use optimized serialization
          const serializedData = serializeChoices(
            filteredItems,
            sorterRef.current.getUserChoices(),
            sorterRef.current.getStateHistory(),
          );

          const stateToSave = {
            optimized: true,
            completedComparisons: sorterRef.current.getComparisonCount(),
            ...serializedData,
          };

          // Compress the state before saving
          const compressed = LZString.compressToEncodedURIComponent(
            JSON.stringify(stateToSave),
          );
          const progressKey = generateProgressKey(sorterId, currentGroupSlugs);
          localStorage.setItem(progressKey, compressed);
        }
      });

      // Set up restart callback
      sorterRef.current.setRestartCallback(() => {
        isRestartingRef.current = true;

        // Don't clear comparison immediately - let the new sort set it
        setSorting(false);

        // Force restart after state updates
        setTimeout(() => {
          if (isRestartingRef.current) {
            isRestartingRef.current = false;
            startSorting();
          }
        }, 50);
      });

      startSorting();
    }
  }, [sorterData, filteredItems, currentGroupSlugs]);

  const startSorting = useCallback(async () => {
    if (!sorterData || !sorterRef.current || filteredItems.length === 0) return;

    if (sorting) {
      return;
    }

    setSorting(true);

    try {
      const onNeedComparison = (
        itemA: SortItem,
        itemB: SortItem,
      ): Promise<string> => {
        return new Promise((resolve) => {
          setCurrentComparison({ itemA, itemB });
          resolveComparisonRef.current = resolve;
        });
      };

      const result = await sorterRef.current.sort(
        filteredItems,
        onNeedComparison,
      );

      // Save results
      setSaving(true);
      
      // Get selected groups for saving with results
      const selectedGroups = sorterData.sorter.useGroups
        ? localStorage.getItem(`sorter_${sorterId}_selectedGroups`)
        : null;

      const selectedGroupIds = selectedGroups ? JSON.parse(selectedGroups) : [];

      const response = await fetch("/api/sorting-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sorterId,
          rankings: result,
          selectedGroups: selectedGroupIds,
        }),
      });

      if (!response.ok) throw new Error("Failed to save results");

      const { resultId } = await response.json();

      // Clear saved progress for this specific group combination
      const progressKey = generateProgressKey(sorterId, currentGroupSlugs);
      localStorage.removeItem(progressKey);

      // Redirect to results page
      router.push(`/results/${resultId}`);
    } catch (error) {
      console.error("Error during sorting:", error);
      setSorting(false);
      setSaving(false);
    }
  }, [sorterData, filteredItems, sorting, sorterId, router, currentGroupSlugs]);

  const handleChoice = useCallback((winnerId: string) => {
    if (resolveComparisonRef.current) {
      setCurrentComparison(null);
      resolveComparisonRef.current(winnerId);
      resolveComparisonRef.current = null;
    }
  }, []);

  const handleUndo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sorterRef.current && sorterRef.current.canUndo()) {
      // Don't clear current comparison - let the restart handle it
      // Clear any pending resolve function
      resolveComparisonRef.current = null;
      // Then call undo
      sorterRef.current.undo();
    }
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sorterRef.current) {
      sorterRef.current.reset();
    }
  }, []);

  if (isLoading) {
    return <SortPageSkeleton />;
  }

  if (error || !sorterData) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <p className="text-black dark:text-white">Failed to load sorter</p>
          <Button onClick={() => router.push(`/sorter/${sorterSlug}`)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <h1 className="mb-3 animate-pulse text-2xl font-bold">
            Saving Results...
          </h1>
          <SortingBarsLoader className="mb-6" />
        </div>
      </div>
    );
  }

  if (!currentComparison) {
    const clearAllSaves = () => {
      try {
        // Get all localStorage keys
        const keys = Object.keys(localStorage);

        // Filter and remove sorting-related keys
        const sortingKeys = keys.filter(
          (key) =>
            key.startsWith("sorting-progress-") ||
            (key.startsWith("sorter_") && key.endsWith("_selectedGroups")),
        );

        sortingKeys.forEach((key) => localStorage.removeItem(key));

        // Show success message and reload
        alert(
          `Cleared ${sortingKeys.length} saved sorting sessions. Reloading page...`,
        );
        window.location.reload();
      } catch (error) {
        console.error("Failed to clear localStorage:", error);
        alert(
          "Failed to clear saves. Please try manually clearing your browser storage.",
        );
      }
    };

    return (
      <div className="container mx-auto max-w-4xl px-2 py-8 md:px-4">
        <div className="space-y-6 text-center">
          <div>
            <p className="mb-2 text-lg text-black dark:text-white">
              Preparing comparison...
            </p>
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          </div>

          <Box variant="warning" size="md" className="mx-auto max-w-md">
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium">
                If this screen persists, you may have a browser storage issue.
              </p>
              <p className="text-xs">
                This can happen when storage is full from saved sorting
                progress.
              </p>
              <Button
                variant="neutral"
                size="sm"
                onClick={clearAllSaves}
                className="w-full"
              >
                Clear All Saved Progress
              </Button>
            </div>
          </Box>
        </div>
      </div>
    );
  }

  // Calculate progress based on actual comparisons needed (like charasort)
  const progress =
    totalComparisons > 0
      ? Math.min(
          99,
          Math.floor((completedComparisons / totalComparisons) * 100),
        )
      : 0;

  return (
    <div className="container mx-auto max-w-4xl px-0 py-8 text-black md:px-4 dark:text-white">
      {/* Header */}
      <div className="mb-6 px-2 md:px-0">
        <Box variant="primary" size="md" className="mb-6 block">
          <div>
            <h1 className="text-xl font-bold">{sorterData.sorter.title}</h1>
          </div>
        </Box>
        {/* Progress and Actions - Compact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-black dark:text-white">
            <span>
              {completedComparisons} comparisons • {progress}% complete
            </span>
            <div className="hidden md:block">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="h-7 px-2 text-xs"
                >
                  <Undo2 className="mr-1" size={12} />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={handleReset}
                  disabled={completedComparisons === 0}
                  className="h-7 px-2 text-xs"
                >
                  <RotateCcw className="mr-1" size={12} />
                  Reset
                </Button>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-4 w-full md:h-6" />
          <div className="block md:hidden">
            <div className="flex gap-1">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                className="h-7 px-2 text-xs"
              >
                <Undo2 className="mr-1" size={12} />
                Undo
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={handleReset}
                disabled={completedComparisons === 0}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="mr-1" size={12} />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="relative grid grid-cols-2 items-stretch gap-2 px-0 md:gap-4 md:px-0">
        {/* Item A */}
        <ComparisonCard
          className="md:mx-auto md:w-80"
          imageUrl={currentComparison.itemA.imageUrl}
          title={currentComparison.itemA.title}
          onClick={() => handleChoice(currentComparison.itemA.id)}
        />

        {/* Item B */}
        <ComparisonCard
          className="md:mx-auto md:w-80"
          imageUrl={currentComparison.itemB.imageUrl}
          title={currentComparison.itemB.title}
          onClick={() => handleChoice(currentComparison.itemB.id)}
        />

        {/* VS Divider - neobrutalist styling, visible on all devices */}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-main border-border shadow-shadow rounded-base border-2 px-3 py-2">
            <span className="text-sm font-bold text-black">VS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
