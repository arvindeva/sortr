"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Undo2, RotateCcw } from "lucide-react";
import { SortItem } from "@/lib/sorting";
import { InteractiveMergeSort, SortState } from "@/lib/interactive-merge-sort";
import LZString from "lz-string";

interface SorterData {
  sorter: {
    id: string;
    title: string;
    description: string;
    useGroups: boolean;
  };
  items: SortItem[];
  groups?: {
    id: string;
    name: string;
    items: SortItem[];
  }[];
}

interface ComparisonState {
  itemA: SortItem;
  itemB: SortItem;
}

async function fetchSorterData(sorterId: string): Promise<SorterData> {
  const response = await fetch(`/api/sorters/${sorterId}`);
  if (!response.ok) throw new Error("Failed to fetch sorter");
  return response.json();
}

export default function SortPage() {
  const params = useParams();
  const router = useRouter();
  const sorterId = params.id as string;

  const [currentComparison, setCurrentComparison] =
    useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [filteredItems, setFilteredItems] = useState<SortItem[]>([]);
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
    queryKey: ["sorter", sorterId],
    queryFn: () => fetchSorterData(sorterId),
    retry: 1,
  });

  // Process filtered items when data loads
  useEffect(() => {
    if (sorterData) {
      let itemsToSort = sorterData.items;
      
      // If using groups, filter items based on selected groups
      if (sorterData.sorter.useGroups && sorterData.groups) {
        const selectedGroups = localStorage.getItem(`sorter_${sorterId}_selectedGroups`);
        
        if (selectedGroups) {
          try {
            const selectedGroupIds: string[] = JSON.parse(selectedGroups);
            
            // If no groups selected, redirect to filters page
            if (selectedGroupIds.length === 0) {
              router.push(`/sorter/${sorterId}/filters`);
              return;
            }
            
            // Filter items to only include those from selected groups
            itemsToSort = sorterData.groups
              .filter(group => selectedGroupIds.includes(group.id))
              .flatMap(group => group.items);
          } catch (error) {
            console.error("Failed to parse selected groups:", error);
            // Redirect to filters page on error
            router.push(`/sorter/${sorterId}/filters`);
            return;
          }
        } else {
          // No selection found, redirect to filters
          router.push(`/sorter/${sorterId}/filters`);
          return;
        }
      }
      
      setFilteredItems(itemsToSort);
    }
  }, [sorterData, sorterId, router]);

  // Initialize sorting when data loads
  useEffect(() => {
    if (sorterData && filteredItems.length > 0 && !sorting && !sorterRef.current) {
      // Check for saved progress
      const savedState = localStorage.getItem(`sorting-progress-${sorterId}`);
      let savedChoices: Map<string, string> | undefined;
      let savedComparisonCount = 0;
      let savedStateHistory: SortState[] | undefined;

      if (savedState) {
        try {
          // Decompress the saved state
          const decompressed = LZString.decompressFromEncodedURIComponent(savedState);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            savedChoices = new Map(parsed.userChoicesArray || []);
            savedComparisonCount = parsed.completedComparisons || 0;

            // Restore state history if available
            if (parsed.stateHistoryArray) {
              savedStateHistory = parsed.stateHistoryArray.map(
                (historyState: any) => ({
                  userChoices: new Map(historyState.userChoicesArray || []),
                  comparisonCount: historyState.comparisonCount || 0,
                }),
              );
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
        setCompletedComparisons(completed);
        setTotalComparisons(total);
        setCanUndo(sorterRef.current?.canUndo() || false);
      });

      // Set up save callback
      sorterRef.current.setSaveCallback(() => {
        if (sorterRef.current) {
          const stateToSave = {
            userChoicesArray: Array.from(
              sorterRef.current.getUserChoices().entries(),
            ),
            completedComparisons: sorterRef.current.getComparisonCount(),
            stateHistoryArray: sorterRef.current
              .getStateHistory()
              .map((state) => ({
                userChoicesArray: Array.from(state.userChoices.entries()),
                comparisonCount: state.comparisonCount,
              })),
          };
          
          // Compress the state before saving
          const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(stateToSave));
          localStorage.setItem(
            `sorting-progress-${sorterId}`,
            compressed,
          );
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
  }, [sorterData, filteredItems]);

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

      // Clear saved progress and selected groups
      localStorage.removeItem(`sorting-progress-${sorterId}`);
      localStorage.removeItem(`sorter_${sorterId}_selectedGroups`);

      // Redirect to results page
      router.push(`/results/${resultId}`);
    } catch (error) {
      console.error("Error during sorting:", error);
      setSorting(false);
      setSaving(false);
    }
  }, [sorterData, filteredItems, sorting, sorterId, router]);

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
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading sorter...</p>
        </div>
      </div>
    );
  }

  if (error || !sorterData) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load sorter</p>
          <Button onClick={() => router.push(`/sorter/${sorterId}`)}>
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
          <Trophy className="mx-auto mb-4" size={48} />
          <h1 className="mb-2 text-2xl font-bold">Saving Results...</h1>
          <p className="text-muted-foreground mb-4">
            Please wait while we save your results
          </p>
        </div>
      </div>
    );
  }

  if (!currentComparison) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Preparing comparison...</p>
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
    <div className="container mx-auto max-w-4xl px-0 py-8 md:px-4">
      {/* Header */}
      <div className="mb-6 px-2 md:px-0">
        <h1 className="mb-2 text-2xl">
          <span className="text-muted-foreground font-normal">Sorting:</span>{" "}
          <span className="font-bold">{sorterData.sorter.title}</span>
        </h1>

        {/* Progress and Actions - Compact */}
        <div className="space-y-3">
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              {completedComparisons} comparisons • {progress}% complete
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
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
                variant="outline"
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
          <Progress value={progress} className="h-2 w-full" />
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="relative grid grid-cols-2 gap-2 px-0 md:gap-4 md:px-0">
        {/* Item A */}
        <Card
          className="hover:border-primary/50 h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md md:mx-auto md:w-fit"
          onClick={() => handleChoice(currentComparison.itemA.id)}
        >
          <CardContent className="flex flex-col p-0 text-center md:px-6 md:py-1">
            <h3 className="px-2 py-1 text-sm font-semibold md:mb-1 md:p-0 md:text-lg">
              {currentComparison.itemA.title}
            </h3>
            {currentComparison.itemA.imageUrl ? (
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-100 md:mx-auto md:h-64 md:w-64 md:rounded-lg">
                <img
                  src={currentComparison.itemA.imageUrl}
                  alt={currentComparison.itemA.title}
                  className="h-full w-full object-cover md:max-h-full md:max-w-full md:object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-gray-100 md:mx-auto md:h-64 md:w-64 md:rounded-lg">
                <span className="text-muted-foreground text-lg md:text-4xl font-bold">
                  {currentComparison.itemA.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item B */}
        <Card
          className="hover:border-primary/50 h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md md:mx-auto md:w-fit"
          onClick={() => handleChoice(currentComparison.itemB.id)}
        >
          <CardContent className="flex flex-col p-0 text-center md:px-6 md:py-1">
            <h3 className="px-2 py-1 text-sm font-semibold md:mb-1 md:p-0 md:text-lg">
              {currentComparison.itemB.title}
            </h3>
            {currentComparison.itemB.imageUrl ? (
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-gray-100 md:mx-auto md:h-64 md:w-64 md:rounded-lg">
                <img
                  src={currentComparison.itemB.imageUrl}
                  alt={currentComparison.itemB.title}
                  className="h-full w-full object-cover md:max-h-full md:max-w-full md:object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-gray-100 md:mx-auto md:h-64 md:w-64 md:rounded-lg">
                <span className="text-muted-foreground text-lg md:text-4xl font-bold">
                  {currentComparison.itemB.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* VS Divider - desktop only */}
        <div className="absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 transform md:block">
          <div className="bg-background rounded-full border px-4 py-2 shadow-md">
            <span className="text-muted-foreground text-sm font-bold">VS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
