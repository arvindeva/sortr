"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LZString from "lz-string";
import { InteractiveMergeSort, SortState } from "@/lib/interactive-merge-sort";
import { SortItem } from "@/lib/sorting";
import {
  deserializeChoices,
  generateProgressKey,
  serializeChoices,
} from "@/lib/sort-persistence";

export interface ComparisonState {
  itemA: SortItem;
  itemB: SortItem;
}

interface UseSorterEngineOptions {
  items: SortItem[];
  sorterId: string;
  filterSlugs: string[];
  enabled: boolean; // images preloaded and data ready
  onComplete: (result: SortItem[]) => void;
}

export function useSorterEngine({
  items,
  sorterId,
  filterSlugs,
  enabled,
  onComplete,
}: UseSorterEngineOptions) {
  const sorterRef = useRef<InteractiveMergeSort | null>(null);
  const resolveComparisonRef = useRef<((winnerId: string) => void) | null>(
    null,
  );
  const isRestartingRef = useRef(false);

  const [currentComparison, setCurrentComparison] =
    useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [canUndo, setCanUndo] = useState(false);

  // Initialize sorting engine when enabled and items ready
  useEffect(() => {
    if (!enabled || items.length === 0 || sorterRef.current) return;

    const progressKey = generateProgressKey(sorterId, filterSlugs);
    const savedState = typeof window !== "undefined"
      ? window.localStorage.getItem(progressKey)
      : null;

    let savedChoices: Map<string, string> | undefined;
    let savedComparisonCount = 0;
    let savedStateHistory: SortState[] | undefined;
    let savedShuffledOrder: SortItem[] | undefined;
    let savedTotalBattles: number | undefined;
    let savedSortedNo: number | undefined;

    if (savedState) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(savedState);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          savedComparisonCount = parsed.completedComparisons || 0;

          if (parsed.optimized) {
            const { userChoices, stateHistory, shuffledOrder, totalBattles, sortedNo } =
              deserializeChoices(parsed, items);
            savedChoices = userChoices;
            savedStateHistory = stateHistory;
            savedTotalBattles = totalBattles;
            savedSortedNo = sortedNo;
            if (shuffledOrder.length > 0) savedShuffledOrder = shuffledOrder;
          } else {
            // Legacy format support
            savedChoices = new Map(parsed.userChoicesArray || []);
            if (parsed.stateHistoryArray) {
              savedStateHistory = parsed.stateHistoryArray.map((historyState: any) => ({
                userChoices: new Map(historyState.userChoicesArray || []),
                comparisonCount: historyState.comparisonCount || 0,
              }));
            }
          }
          setCompletedComparisons(savedComparisonCount);
        }
      } catch (e) {
        console.error("Failed to restore saved state", e);
      }
    }

    sorterRef.current = new InteractiveMergeSort({
      savedChoices,
      savedComparisonCount,
      savedStateHistory,
      savedTotalBattles,
      savedSortedNo,
    });

    if (savedShuffledOrder) {
      sorterRef.current.setShuffledOrder(savedShuffledOrder);
    }

    sorterRef.current.setProgressCallback((comparisons, percent) => {
      // Small delay to smooth UI updates
      setTimeout(() => {
        setCompletedComparisons(comparisons);
        setProgressPercent(percent);
        setCanUndo(sorterRef.current?.canUndo() || false);
      }, 100);
    });

    sorterRef.current.setSaveCallback(() => {
      if (!sorterRef.current) return;
      const serializedData = serializeChoices(
        items,
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
      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(stateToSave),
      );
      try {
        window.localStorage.setItem(progressKey, compressed);
      } catch (e) {
        console.warn("Failed to persist progress", e);
      }
    });

    sorterRef.current.setRestartCallback(() => {
      isRestartingRef.current = true;
      setSorting(false);
      setTimeout(() => {
        if (isRestartingRef.current) {
          isRestartingRef.current = false;
          startSorting();
        }
      }, 50);
    });

    // Kick off sorting
    startSorting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, items, sorterId, JSON.stringify(filterSlugs)]);

  const startSorting = useCallback(async () => {
    if (!sorterRef.current || items.length === 0) return;
    if (sorting) return;
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

      const result = await sorterRef.current.sort(items, onNeedComparison);
      onComplete(result);
    } catch (e) {
      // Let the consumer decide further error handling
      console.error("Sorting failed", e);
      setSorting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sorting]);

  const choose = useCallback((winnerId: string) => {
    if (resolveComparisonRef.current) {
      setCurrentComparison(null);
      resolveComparisonRef.current(winnerId);
      resolveComparisonRef.current = null;
    }
  }, []);

  const undo = useCallback(() => {
    if (sorterRef.current && sorterRef.current.canUndo()) {
      setCurrentComparison(null);
      resolveComparisonRef.current = null;
      sorterRef.current.undo();
    }
  }, []);

  const reset = useCallback(() => {
    sorterRef.current?.reset();
  }, []);

  const removeItem = useCallback((itemId: string) => {
    sorterRef.current?.removeItem(itemId);
  }, []);

  return {
    currentComparison,
    sorting,
    completedComparisons,
    progressPercent,
    canUndo,
    choose,
    undo,
    reset,
    removeItem,
  };
}

