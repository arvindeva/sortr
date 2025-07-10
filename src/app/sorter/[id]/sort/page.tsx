"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy } from "lucide-react";
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

// Real-time merge sort that asks for comparisons as needed
class InteractiveMergeSort {
  private userChoices = new Map<string, string>();
  private comparisonCount = 0;
  private pendingComparison: ((winner: string) => void) | null = null;

  constructor(savedChoices?: Map<string, string>) {
    if (savedChoices) {
      this.userChoices = new Map(savedChoices);
    }
  }

  async sort(items: SortItem[], onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>): Promise<SortItem[]> {
    return await this.mergeSort(items, onNeedComparison);
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
        this.comparisonCount++;
        winner = await onNeedComparison(leftItem, rightItem);
        this.userChoices.set(key, winner);
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
}

export default function SortPage() {
  const params = useParams();
  const router = useRouter();
  const sorterId = params.id as string;

  const [currentComparison, setCurrentComparison] = useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const sorterRef = useRef<InteractiveMergeSort | null>(null);
  const resolveComparisonRef = useRef<((winnerId: string) => void) | null>(null);

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
      
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          savedChoices = new Map(parsed.userChoicesArray || []);
          setCompletedComparisons(parsed.completedComparisons || 0);
        } catch (error) {
          console.error("Failed to parse saved state:", error);
        }
      }

      sorterRef.current = new InteractiveMergeSort(savedChoices);
      setEstimatedTotal(Math.ceil(sorterData.items.length * Math.log2(sorterData.items.length)));
      startSorting();
    }
  }, [sorterData, sorting]);

  const startSorting = useCallback(async () => {
    if (!sorterData || !sorterRef.current || sorting) return;

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
      const newCount = completedComparisons + 1;
      setCompletedComparisons(newCount);
      setCurrentComparison(null);
      
      // Save progress
      if (sorterRef.current) {
        const stateToSave = {
          userChoicesArray: Array.from(sorterRef.current.getUserChoices().entries()),
          completedComparisons: newCount,
        };
        localStorage.setItem(`sorting-progress-${sorterId}`, JSON.stringify(stateToSave));
      }
      
      resolveComparisonRef.current(winnerId);
      resolveComparisonRef.current = null;
    }
  }, [completedComparisons, sorterId]);

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

  const progress = estimatedTotal > 0 ? Math.round((completedComparisons / estimatedTotal) * 100) : 0;

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
              Comparison {completedComparisons + 1} of ~{estimatedTotal}
            </span>
            <span>{progress}% complete</span>
          </div>
          <Progress value={progress} className="w-full" />
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