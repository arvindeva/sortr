"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Undo2, RotateCcw } from "lucide-react";
import { SortItem } from "@/lib/sorting";

interface SorterData {
  sorter: {
    id: string;
    title: string;
    description: string;
  };
  items: SortItem[];
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

function getComparisonKey(itemA: SortItem, itemB: SortItem): string {
  return [itemA.id, itemB.id].sort().join(",");
}

interface SortState {
  userChoices: Map<string, string>;
  comparisonCount: number;
}

// Real-time merge sort that asks for comparisons as needed
class InteractiveMergeSort {
  private userChoices = new Map<string, string>();
  private comparisonCount = 0;
  private totalComparisons = 0;
  private stateHistory: SortState[] = [];
  private onProgressUpdate?: (completed: number, total: number) => void;
  private onSaveProgress?: () => void;
  private onRestartRequested?: () => void;

  constructor(
    savedChoices?: Map<string, string>,
    savedComparisonCount = 0,
    savedStateHistory?: SortState[],
  ) {
    if (savedChoices) {
      this.userChoices = new Map(savedChoices);
    }
    this.comparisonCount = savedComparisonCount;
    if (savedStateHistory) {
      this.stateHistory = savedStateHistory;
    }
  }

  setProgressCallback(callback: (completed: number, total: number) => void) {
    this.onProgressUpdate = callback;
  }

  setSaveCallback(callback: () => void) {
    this.onSaveProgress = callback;
  }

  setRestartCallback(callback: () => void) {
    this.onRestartRequested = callback;
  }

  private saveStateSnapshot() {
    this.stateHistory.push({
      userChoices: new Map(this.userChoices),
      comparisonCount: this.comparisonCount,
    });
  }

  canUndo(): boolean {
    return this.stateHistory.length > 0;
  }

  undo(): boolean {
    if (this.stateHistory.length === 0) return false;

    const previousState = this.stateHistory.pop()!;
    this.userChoices = previousState.userChoices;
    this.comparisonCount = previousState.comparisonCount;

    // Update progress
    this.onProgressUpdate?.(this.comparisonCount, this.totalComparisons);
    this.onSaveProgress?.();

    // Request restart of sorting from current state
    this.onRestartRequested?.();

    return true;
  }

  reset() {
    this.userChoices.clear();
    this.comparisonCount = 0;
    this.stateHistory = [];

    // Update progress
    this.onProgressUpdate?.(0, this.totalComparisons);
    this.onSaveProgress?.();

    // Request restart of sorting from beginning
    this.onRestartRequested?.();
  }

  async sort(
    items: SortItem[],
    onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>,
  ): Promise<SortItem[]> {
    // Calculate total comparisons needed by simulating the sort first
    this.totalComparisons = this.simulateSort(items);
    this.onProgressUpdate?.(this.comparisonCount, this.totalComparisons);

    return await this.mergeSort(items, onNeedComparison);
  }

  private simulateSort(items: SortItem[]): number {
    // Calculate total potential merges needed (like charasort's totalBattles)
    let totalMerges = 0;

    const calculateMerges = (length: number): number => {
      if (length <= 1) return 0;

      const mid = Math.floor(length / 2);
      const leftLength = mid;
      const rightLength = length - mid;

      // Add merges needed for this level (minimum of left and right lengths)
      totalMerges += Math.min(leftLength, rightLength);

      // Recursively calculate for sublists
      calculateMerges(leftLength);
      calculateMerges(rightLength);

      return totalMerges;
    };

    calculateMerges(items.length);

    // Subtract comparisons we already know
    let knownComparisons = 0;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (this.userChoices.get(getComparisonKey(items[i], items[j]))) {
          knownComparisons++;
        }
      }
    }

    return Math.max(1, totalMerges - Math.floor(knownComparisons * 0.3));
  }

  private async mergeSort(
    items: SortItem[],
    onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>,
  ): Promise<SortItem[]> {
    if (items.length <= 1) return items;

    const mid = Math.floor(items.length / 2);
    const left = await this.mergeSort(items.slice(0, mid), onNeedComparison);
    const right = await this.mergeSort(items.slice(mid), onNeedComparison);

    return await this.merge(left, right, onNeedComparison);
  }

  private async merge(
    left: SortItem[],
    right: SortItem[],
    onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>,
  ): Promise<SortItem[]> {
    const result: SortItem[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const leftItem = left[leftIndex];
      const rightItem = right[rightIndex];
      const key = getComparisonKey(leftItem, rightItem);

      // Check if we already know the preference
      let winner = this.userChoices.get(key);

      if (!winner) {
        // Need user input for this comparison
        winner = await onNeedComparison(leftItem, rightItem);

        // Save state snapshot AFTER the comparison is made
        this.saveStateSnapshot();

        this.comparisonCount++;
        this.onProgressUpdate?.(this.comparisonCount, this.totalComparisons);
        this.userChoices.set(key, winner);
        this.onSaveProgress?.(); // Save progress after updating count
      }

      if (winner === leftItem.id) {
        result.push(leftItem);
        leftIndex++;
      } else {
        result.push(rightItem);
        rightIndex++;
      }
    }

    // Add remaining items
    while (leftIndex < left.length) {
      result.push(left[leftIndex]);
      leftIndex++;
    }
    while (rightIndex < right.length) {
      result.push(right[rightIndex]);
      rightIndex++;
    }

    return result;
  }

  getComparisonCount(): number {
    return this.comparisonCount;
  }

  getUserChoices(): Map<string, string> {
    return this.userChoices;
  }

  getStateHistory(): SortState[] {
    return this.stateHistory;
  }
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

  // Initialize sorting when data loads
  useEffect(() => {
    if (sorterData && !sorting && !sorterRef.current) {
      // Check for saved progress
      const savedState = localStorage.getItem(`sorting-progress-${sorterId}`);
      let savedChoices: Map<string, string> | undefined;
      let savedComparisonCount = 0;
      let savedStateHistory: SortState[] | undefined;

      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
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
          localStorage.setItem(
            `sorting-progress-${sorterId}`,
            JSON.stringify(stateToSave),
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
  }, [sorterData]);

  const startSorting = useCallback(async () => {
    if (!sorterData || !sorterRef.current) return;

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
        sorterData.items,
        onNeedComparison,
      );

      // Save results
      setSaving(true);
      const response = await fetch("/api/sorting-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sorterId,
          rankings: result,
        }),
      });

      if (!response.ok) throw new Error("Failed to save results");

      const { resultId } = await response.json();

      // Clear saved progress
      localStorage.removeItem(`sorting-progress-${sorterId}`);

      // Redirect to results page
      router.push(`/results/${resultId}`);
    } catch (error) {
      console.error("Error during sorting:", error);
      setSorting(false);
      setSaving(false);
    }
  }, [sorterData, sorting, sorterId, router]);

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
          className="hover:border-primary/50 h-full cursor-pointer border-2 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md md:mx-auto md:w-fit"
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
                <span className="text-muted-foreground text-xs md:text-sm">
                  No image
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Item B */}
        <Card
          className="hover:border-primary/50 h-full cursor-pointer border-2 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md md:mx-auto md:w-fit"
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
                <span className="text-muted-foreground text-xs md:text-sm">
                  No image
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
