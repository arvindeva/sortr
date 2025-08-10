"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useImagePreloader } from "@/hooks/use-image-preloader";
import { ComparisonCard } from "@/components/ui/comparison-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Undo2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SortItem } from "@/lib/sorting";
import { InteractiveMergeSort, SortState } from "@/lib/interactive-merge-sort";
import { generateProgressKey, serializeChoices, deserializeChoices } from "@/lib/sort-persistence";
import LZString from "lz-string";
import { Box } from "@/components/ui/box";
import { PageHeader } from "@/components/ui/page-header";
import { SortPageSkeleton } from "@/components/sort-page-skeleton";
import { Spinner } from "@/components/ui/spinner";

interface SorterData {
  sorter: {
    id: string;
    title: string;
    description: string;
    slug: string;
    useGroups?: boolean; // Optional for backward compatibility
  };
  items: (SortItem & { tagSlugs?: string[] })[];
  groups?: {
    id: string;
    name: string;
    slug: string;
    items: SortItem[];
  }[];
  tags?: {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
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

// Extract all image URLs from items for preloading
function extractImageUrls(items: SortItem[]): string[] {
  const imageUrls: string[] = [];

  items.forEach((item) => {
    // Add item image if available
    if (item.imageUrl) {
      imageUrls.push(item.imageUrl);
    }
  });

  // Remove duplicates
  return [...new Set(imageUrls)];
}

// (persistence helpers imported from @/lib/sort-persistence)

export default function SortPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sorterSlug = params.slug as string;
  const queryClient = useQueryClient();

  const [currentComparison, setCurrentComparison] =
    useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [filteredItems, setFilteredItems] = useState<SortItem[]>([]);
  const [currentFilterSlugs, setCurrentFilterSlugs] = useState<string[]>([]);
  const [sorterId, setSorterId] = useState<string>("");
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const sorterRef = useRef<InteractiveMergeSort | null>(null);
  const resolveComparisonRef = useRef<((winnerId: string) => void) | null>(
    null,
  );
  const isRestartingRef = useRef(false);

  // Image preloader
  const {
    progress: preloadProgress,
    preloadImages,
    reset: resetPreloader,
  } = useImagePreloader();

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
      let filterSlugs: string[] = [];

      // Check for tag-based filtering first (new system)
      if (sorterData.tags && sorterData.tags.length > 0) {
        const tagsParam = searchParams.get("tags");

        if (tagsParam) {
          try {
            const selectedTagSlugs = tagsParam
              .split(",")
              .filter((slug) => slug.trim());

            if (selectedTagSlugs.length === 0) {
              itemsToSort = sorterData.items;
              filterSlugs = [];
            } else {
              // Filter items that have any of the selected tags
              itemsToSort = sorterData.items.filter((item) => {
                // Include items that have any of the selected tags
                const matchingTags = sorterData.tags!.filter((tag) =>
                  selectedTagSlugs.includes(tag.slug),
                );
                const tagItemIds = new Set(
                  matchingTags.flatMap((tag) =>
                    tag.items.map((item) => item.id),
                  ),
                );

                // Also include items with no tags (empty tagSlugs array) - they appear in all filters
                const hasMatchingTag = tagItemIds.has(item.id);
                const isUntagged = !item.tagSlugs || item.tagSlugs.length === 0;

                return hasMatchingTag || isUntagged;
              });
              filterSlugs = selectedTagSlugs;
            }
          } catch (error) {
            console.error("Failed to parse selected tags:", error);
            itemsToSort = sorterData.items;
            filterSlugs = [];
          }
        } else {
          // No tags param, default to all items
          itemsToSort = sorterData.items;
          filterSlugs = [];
        }
      }
      // Fallback to group-based filtering (legacy system)
      else if (sorterData.sorter.useGroups && sorterData.groups) {
        const groupsParam = searchParams.get("groups");

        if (groupsParam) {
          try {
            const selectedGroupSlugs = groupsParam
              .split(",")
              .filter((slug) => slug.trim());

            if (selectedGroupSlugs.length === 0) {
              itemsToSort = sorterData.items;
              filterSlugs = [];
            } else {
              // Filter items to only include those from selected groups
              itemsToSort = sorterData.groups
                .filter((group) => selectedGroupSlugs.includes(group.slug))
                .flatMap((group) => group.items);
              filterSlugs = selectedGroupSlugs;
            }
          } catch (error) {
            console.error("Failed to parse selected groups:", error);
            itemsToSort = sorterData.items;
            filterSlugs = [];
          }
        } else {
          // No groups param, default to all items
          itemsToSort = sorterData.items;
          filterSlugs = [];
        }
      }

      setFilteredItems(itemsToSort);
      setCurrentFilterSlugs(filterSlugs);
      setSorterId(sorterData.sorter.id);
    }
  }, [sorterData, router, searchParams]);

  // Preload images when filtered items change
  useEffect(() => {
    if (filteredItems.length > 0) {
      const imageUrls = extractImageUrls(filteredItems);

      if (imageUrls.length > 0) {
        setImagesPreloaded(false);
        resetPreloader();

        // Set up timeout to proceed even if preloading takes too long (10 seconds)
        const timeoutId = setTimeout(() => {
          console.warn("Image preloading timed out, proceeding with sorting");
          setImagesPreloaded(true);
        }, 10000);

        preloadImages(imageUrls)
          .then(() => {
            clearTimeout(timeoutId);
            setImagesPreloaded(true);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            console.warn("Some images failed to preload:", error);
            // Still allow sorting to proceed even if some images fail
            setImagesPreloaded(true);
          });
      } else {
        // No images to preload
        setImagesPreloaded(true);
      }
    } else {
      // Reset preloading state when no items
      setImagesPreloaded(false);
    }
  }, [filteredItems, preloadImages, resetPreloader]);

  // Initialize sorting when data loads and images are preloaded
  useEffect(() => {
    if (
      sorterData &&
      filteredItems.length > 0 &&
      imagesPreloaded &&
      !sorting &&
      !sorterRef.current
    ) {
      // Check for saved progress using filter-specific key
      const progressKey = generateProgressKey(sorterId, currentFilterSlugs);
      const savedState = localStorage.getItem(progressKey);
      let savedChoices: Map<string, string> | undefined;
      let savedComparisonCount = 0;
      let savedStateHistory: SortState[] | undefined;
      let savedShuffledOrder: SortItem[] | undefined;
      let savedTotalBattles: number | undefined;
      let savedSortedNo: number | undefined;

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
              const { userChoices, stateHistory, shuffledOrder, totalBattles, sortedNo } =
                deserializeChoices(parsed, filteredItems);
              savedChoices = userChoices;
              savedStateHistory = stateHistory;
              savedTotalBattles = totalBattles;
              savedSortedNo = sortedNo;
              if (shuffledOrder.length > 0) {
                savedShuffledOrder = shuffledOrder;
              }
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

      sorterRef.current = new InteractiveMergeSort({
        savedChoices,
        savedComparisonCount,
        savedStateHistory,
        savedTotalBattles,
        savedSortedNo,
      });

      // Restore shuffled order if available
      if (savedShuffledOrder) {
        sorterRef.current.setShuffledOrder(savedShuffledOrder);
      }

      // Set up progress tracking - simple approach
      sorterRef.current.setProgressCallback((comparisons, progressPercent) => {
        // Small delay to ensure DOM is ready for animation
        setTimeout(() => {
          setCompletedComparisons(comparisons);
          setTotalComparisons(progressPercent);
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
            sorterRef.current.getShuffledOrder(),
            sorterRef.current.getTotalBattles(),
            sorterRef.current.getSortedNo(),
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
          const progressKey = generateProgressKey(sorterId, currentFilterSlugs);
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
  }, [sorterData, filteredItems, imagesPreloaded, currentFilterSlugs]);

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

      // Get selected filter IDs based on URL parameters and sorter data
      let selectedGroupIds: string[] = [];
      let selectedTagSlugs: string[] = [];

      if (sorterData.tags && sorterData.tags.length > 0) {
        // New tag-based system
        selectedTagSlugs = currentFilterSlugs;
      } else if (
        sorterData.sorter.useGroups &&
        sorterData.groups &&
        currentFilterSlugs.length > 0
      ) {
        // Legacy group-based system - convert group slugs to group IDs
        selectedGroupIds = sorterData.groups
          .filter((group) => currentFilterSlugs.includes(group.slug))
          .map((group) => group.id);
      }

      const response = await fetch("/api/sorting-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sorterId,
          rankings: result,
          selectedGroups: selectedGroupIds, // Legacy support
          selectedTagSlugs: selectedTagSlugs, // New tag support
        }),
      });

      if (!response.ok) throw new Error("Failed to save results");

      const { resultId } = await response.json();

      // Clear saved progress for this specific filter combination
      const progressKey = generateProgressKey(sorterId, currentFilterSlugs);
      localStorage.removeItem(progressKey);

      // Invalidate sorter data cache to show new ranking in recent rankings
      queryClient.invalidateQueries({
        queryKey: ["sorter", sorterSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["sorter", sorterSlug, "recent-results"],
      });

      // Redirect to results page
      router.push(`/rankings/${resultId}`);
    } catch (error) {
      console.error("Error during sorting:", error);
      setSorting(false);
      setSaving(false);
    }
  }, [
    sorterData,
    filteredItems,
    sorting,
    sorterId,
    router,
    currentFilterSlugs,
  ]);

  const handleChoice = useCallback((winnerId: string) => {
    if (resolveComparisonRef.current) {
      setCurrentComparison(null);
      resolveComparisonRef.current(winnerId);
      resolveComparisonRef.current = null;
    }
  }, []);

  const handleRemoveItem = useCallback((itemId: string, itemTitle: string) => {
    if (sorterRef.current) {
      sorterRef.current.removeItem(itemId);
      toast.success(`Removed "${itemTitle}" from sorting`);
    }
  }, []);

  const handleUndo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sorterRef.current && sorterRef.current.canUndo()) {
      // Keep current comparison visible to avoid UI flicker
      // Clear only the resolve function so clicks do nothing during restart
      resolveComparisonRef.current = null;
      
      // Undo will restore state and restart from that point
      sorterRef.current.undo();
    }
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowResetDialog(true);
  }, []);

  const confirmReset = useCallback(() => {
    if (sorterRef.current) {
      sorterRef.current.reset();
    }
    setShowResetDialog(false);
  }, []);

  const cancelReset = useCallback(() => {
    setShowResetDialog(false);
  }, []);

  if (isLoading) {
    return <SortPageSkeleton />;
  }

  if (error || !sorterData) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
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
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="text-center">
          <h1 className="mb-3 animate-pulse text-2xl font-bold">
            Saving Results...
          </h1>
          <div className="mb-6">
            <Spinner size={32} />
          </div>
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
        const sortingKeys = keys.filter((key) =>
          key.startsWith("sorting-progress-"),
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

    // Show image preloading progress
    const showPreloadProgress = !imagesPreloaded && preloadProgress.total > 0;
    const preloadPercentage =
      preloadProgress.total > 0
        ? Math.round((preloadProgress.loaded / preloadProgress.total) * 100)
        : 0;

    return (
      <div className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
        <div className="space-y-6 text-center">
          <div>
            {showPreloadProgress ? (
              <>
                <p className="mb-2 text-lg text-black dark:text-white">
                  Loading images... {preloadProgress.loaded}/
                  {preloadProgress.total} ({preloadPercentage}%)
                </p>
                <Progress
                  value={preloadPercentage}
                  className="mx-auto mb-4 max-w-md"
                />
                {preloadProgress.failed > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {preloadProgress.failed} image
                    {preloadProgress.failed !== 1 ? "s" : ""} failed to load
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 text-lg text-black dark:text-white">
                  Preparing comparison...
                </p>
                <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
              </>
            )}
          </div>

          <Box variant="warning" size="md" className="mx-auto max-w-md">
            <div className="space-y-3 text-center">
              <p className="font-medium">
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

  // Simple progress - totalComparisons now holds the progress percentage
  const progress = Math.floor(totalComparisons);

  return (
    <div className="container mx-auto max-w-6xl px-0 py-8 text-black md:px-4 dark:text-white">
      {/* Header */}
      <div className="mb-6 px-2 md:px-0">
        <Box variant="primary" size="md" className="mb-6 block">
          <div>
            <PageHeader>{sorterData.sorter.title}</PageHeader>
          </div>
        </Box>
        {/* Progress and Actions - Compact */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-black dark:text-white">
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
                  className="h-7 px-2"
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
                  className="h-7 px-2"
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
          canRemove={filteredItems.length > 1}
          onRemove={() => handleRemoveItem(currentComparison.itemA.id, currentComparison.itemA.title)}
        />

        {/* Item B */}
        <ComparisonCard
          className="md:mx-auto md:w-80"
          imageUrl={currentComparison.itemB.imageUrl}
          title={currentComparison.itemB.title}
          onClick={() => handleChoice(currentComparison.itemB.id)}
          canRemove={filteredItems.length > 1}
          onRemove={() => handleRemoveItem(currentComparison.itemB.id, currentComparison.itemB.title)}
        />

        {/* VS Divider - neobrutalist styling, visible on all devices */}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="bg-main border-border shadow-shadow rounded-base border-2 px-3 py-2">
            <span className="font-bold text-black">VS</span>
          </div>
        </div>
      </div>

      {/* Progress Saving Reassurance */}
      <div className="mt-6 px-2 text-center md:px-0">
        <p className="text-foreground text-sm">
          Your progress is automatically saved in your browser. Feel free to
          take breaks or navigate away - you can continue anytime!
        </p>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Progress?</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset your progress? This will restart
              the sorting from the beginning and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="neutral" onClick={cancelReset}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmReset}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
