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
  return [itemA.id, itemB.id].sort().join(',');
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

  constructor(savedChoices?: Map<string, string>, savedComparisonCount = 0, savedStateHistory?: SortState[]) {
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

  async sort(items: SortItem[], onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>): Promise<SortItem[]> {
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

  private async mergeSort(items: SortItem[], onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>): Promise<SortItem[]> {
    if (items.length <= 1) return items;

    const mid = Math.floor(items.length / 2);
    const left = await this.mergeSort(items.slice(0, mid), onNeedComparison);
    const right = await this.mergeSort(items.slice(mid), onNeedComparison);

    return await this.merge(left, right, onNeedComparison);
  }

  private async merge(left: SortItem[], right: SortItem[], onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>): Promise<SortItem[]> {
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

  const [currentComparison, setCurrentComparison] = useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const sorterRef = useRef<InteractiveMergeSort | null>(null);
  const resolveComparisonRef = useRef<((winnerId: string) => void) | null>(null);
  const isRestartingRef = useRef(false);

  // Fetch sorter data with TanStack Query
  const { data: sorterData, isLoading, error } = useQuery({
    queryKey: ['sorter', sorterId],
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
            savedStateHistory = parsed.stateHistoryArray.map((historyState: any) => ({
              userChoices: new Map(historyState.userChoicesArray || []),
              comparisonCount: historyState.comparisonCount || 0,
            }));
          }
          
          setCompletedComparisons(savedComparisonCount);
        } catch (error) {
          console.error("Failed to parse saved state:", error);
        }
      }

      sorterRef.current = new InteractiveMergeSort(savedChoices, savedComparisonCount, savedStateHistory);
      
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
            userChoicesArray: Array.from(sorterRef.current.getUserChoices().entries()),
            completedComparisons: sorterRef.current.getComparisonCount(),
            stateHistoryArray: sorterRef.current.getStateHistory().map(state => ({
              userChoicesArray: Array.from(state.userChoices.entries()),
              comparisonCount: state.comparisonCount,
            })),
          };
          localStorage.setItem(`sorting-progress-${sorterId}`, JSON.stringify(stateToSave));
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
      const onNeedComparison = (itemA: SortItem, itemB: SortItem): Promise<string> => {
        return new Promise((resolve) => {
          setCurrentComparison({ itemA, itemB });
          resolveComparisonRef.current = resolve;
        });
      };

      const result = await sorterRef.current.sort(sorterData.items, onNeedComparison);

      // Save results
      setSaving(true);
      const response = await fetch('/api/sorting-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sorterId,
          rankings: result,
        }),
      });

      if (!response.ok) throw new Error('Failed to save results');
      
      const { resultId } = await response.json();
      
      // Clear saved progress
      localStorage.removeItem(`sorting-progress-${sorterId}`);
      
      // Redirect to results page
      router.push(`/results/${resultId}`);
    } catch (error) {
      console.error('Error during sorting:', error);
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <p className="text-muted-foreground">Loading sorter...</p>
        </div>
      </div>
    );
  }

  if (error || !sorterData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <Trophy className="mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold mb-2">Saving Results...</h1>
          <p className="text-muted-foreground mb-4">Please wait while we save your results</p>
        </div>
      </div>
    );
  }

  if (!currentComparison) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <p className="text-muted-foreground">Preparing comparison...</p>
        </div>
      </div>
    );
  }

  // Calculate progress based on actual comparisons needed (like charasort)
  const progress = totalComparisons > 0 ? Math.min(99, Math.floor((completedComparisons / totalComparisons) * 100)) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push(`/sorter/${sorterId}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2" size={16} />
          Back to Sorter
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Sorting: {sorterData.sorter.title}</h1>
        <p className="text-muted-foreground mb-4">
          Choose your preferred option from each pair
        </p>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {completedComparisons} comparisons completed
            </span>
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
          >
            <Undo2 className="mr-2" size={16} />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={completedComparisons === 0}
          >
            <RotateCcw className="mr-2" size={16} />
            Reset
          </Button>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-6 relative">
        {/* Item A */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
          onClick={() => handleChoice(currentComparison.itemA.id)}
        >
          <CardContent className="p-6 text-center">
            {currentComparison.itemA.imageUrl ? (
              <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img
                  src={currentComparison.itemA.imageUrl}
                  alt={currentComparison.itemA.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
            <h3 className="text-lg font-semibold">{currentComparison.itemA.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">Click to choose this option</p>
          </CardContent>
        </Card>

        {/* Item B */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50"
          onClick={() => handleChoice(currentComparison.itemB.id)}
        >
          <CardContent className="p-6 text-center">
            {currentComparison.itemB.imageUrl ? (
              <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                <img
                  src={currentComparison.itemB.imageUrl}
                  alt={currentComparison.itemB.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
            <h3 className="text-lg font-semibold">{currentComparison.itemB.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">Click to choose this option</p>
          </CardContent>
        </Card>

        {/* VS Divider - positioned absolutely for desktop */}
        <div className="hidden md:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-background border rounded-full px-4 py-2 shadow-md">
            <span className="font-bold text-muted-foreground">VS</span>
          </div>
        </div>
      </div>

      {/* Mobile VS Divider */}
      <div className="md:hidden flex items-center justify-center py-4">
        <div className="bg-muted rounded-full px-4 py-2">
          <span className="font-bold text-muted-foreground">VS</span>
        </div>
      </div>
    </div>
  );
}