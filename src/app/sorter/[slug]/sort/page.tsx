"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useImagePreloader } from "@/hooks/use-image-preloader";
import { ComparisonCard } from "@/components/ui/comparison-card";
import { VsMarker } from "@/components/ui/sortr-mark";
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
import { SortPageSkeleton } from "@/components/sort-page-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { track } from "@/lib/analytics";

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
  const { data: session } = useSession();

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
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; title: string } | null>(null);
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

      // A sort was completed and saved — the headline funnel metric.
      track("sort_completed", {
        sorterId,
        itemCount: filteredItems.length,
      });

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

      // Invalidate homepage cache since completion count changed (affects popular sorter ordering)
      queryClient.invalidateQueries({
        queryKey: ["homepage", "popular-sorters"],
      });
      queryClient.invalidateQueries({
        queryKey: ["browse"],
      });

      // Invalidate user profile cache to show new ranking in user's rankings section
      if (session?.user?.email) {
        queryClient.invalidateQueries({
          queryKey: ["user", session.user.email],
        });
        // Also invalidate username-based queries if we have a username
        queryClient.invalidateQueries({
          queryKey: ["user"],
        });
      }

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
    setItemToRemove({ id: itemId, title: itemTitle });
    setShowRemoveDialog(true);
  }, []);

  const confirmRemoveItem = useCallback(() => {
    if (sorterRef.current && itemToRemove) {
      sorterRef.current.removeItem(itemToRemove.id);
      toast.success(`Removed "${itemToRemove.title}" from sorting`);
    }
    setShowRemoveDialog(false);
    setItemToRemove(null);
  }, [itemToRemove]);

  const cancelRemoveItem = useCallback(() => {
    setShowRemoveDialog(false);
    setItemToRemove(null);
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
        <div className="space-y-4 text-center">
          <p className="text-foreground">Failed to load sorter</p>
          <Button onClick={() => router.push(`/sorter/${sorterSlug}`)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center gap-5 text-center">
          <VsMarker size={56} glyph="★" glyphColor="var(--yellow)" />
          <h1 className="display text-3xl font-black text-foreground">
            Ranking locked
          </h1>
          <p className="font-mono text-[13px] text-cyan-ink">
            tallying your picks — taking you to your results…
          </p>
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
                <p className="mb-2 text-lg text-foreground">
                  Loading images... {preloadProgress.loaded}/
                  {preloadProgress.total} ({preloadPercentage}%)
                </p>
                <Progress
                  value={preloadPercentage}
                  className="mx-auto mb-4 max-w-md"
                />
                {preloadProgress.failed > 0 && (
                  <p className="text-sm text-destructive">
                    {preloadProgress.failed} image
                    {preloadProgress.failed !== 1 ? "s" : ""} failed to load
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 text-lg text-foreground">
                  Preparing comparison...
                </p>
                <div className="mb-4">
                  <Spinner size={32} />
                </div>
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
    <div className="container mx-auto max-w-5xl px-4 py-8 text-foreground md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="hud mb-2 text-xs text-cyan-ink">▶ Now sorting</div>
            <h1 className="display text-[clamp(2rem,5.5vw,3.375rem)] font-black text-foreground">
              {sorterData.sorter.title}
            </h1>
            <div className="mt-2.5 font-mono text-[13px] text-muted-foreground">
              {completedComparisons} comparison
              {completedComparisons === 1 ? "" : "s"} · {progress}% complete
            </div>
          </div>
          {/* Undo / Reset */}
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <Undo2 size={14} />
              Undo
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={handleReset}
              disabled={completedComparisons === 0}
            >
              <RotateCcw size={14} />
              Reset
            </Button>
          </div>
        </div>

        {/* Progress track — solid magenta fill. */}
        <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full border border-border bg-foreground/[0.06]">
          <div
            className="bg-main h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="relative mt-10 grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5 md:gap-4">
        {/* Item A */}
        <ComparisonCard
          side="left"
          imageUrl={currentComparison.itemA.imageUrl}
          title={currentComparison.itemA.title}
          onClick={() => handleChoice(currentComparison.itemA.id)}
          canRemove={filteredItems.length > 1}
          onRemove={() => handleRemoveItem(currentComparison.itemA.id, currentComparison.itemA.title)}
        />

        {/* VS marker between contenders — static (no pulse) so it doesn't
            distract from the actual duel. Smaller on mobile for more card width. */}
        <div className="flex items-center justify-center">
          <VsMarker size={40} pulse={false} className="sm:hidden" />
          <VsMarker
            size={60}
            pulse={false}
            className="mx-2 hidden sm:flex"
          />
        </div>

        {/* Item B */}
        <ComparisonCard
          side="right"
          imageUrl={currentComparison.itemB.imageUrl}
          title={currentComparison.itemB.title}
          onClick={() => handleChoice(currentComparison.itemB.id)}
          canRemove={filteredItems.length > 1}
          onRemove={() => handleRemoveItem(currentComparison.itemB.id, currentComparison.itemB.title)}
        />
      </div>

      {/* Keyboard hint + autosave note */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          tap a side to pick
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          ✓ progress saved in your browser — take a break and come back anytime.
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

      {/* Remove Item Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Item?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{itemToRemove?.title}" from this sorting session? 
              This will remove it from all remaining comparisons and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="neutral" onClick={cancelRemoveItem}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmRemoveItem}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
