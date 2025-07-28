import { SortItem } from "@/lib/sorting";

// Fisher-Yates shuffle algorithm for randomizing array order
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getComparisonKey(itemA: SortItem, itemB: SortItem): string {
  return [itemA.id, itemB.id].sort().join(",");
}

export interface SortState {
  userChoices: Map<string, string>;
  comparisonCount: number;
}

export class InteractiveMergeSort {
  private userChoices = new Map<string, string>();
  private comparisonCount = 0;
  private totalComparisons = 0;
  private stateHistory: SortState[] = [];
  private currentItems: SortItem[] = [];
  private hasStarted = false;
  private shuffledOrder: SortItem[] = [];
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
      this.hasStarted = true; // If we have saved choices, sorting has started
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

    // Keep only the last 1 state to prevent storage bloat
    if (this.stateHistory.length > 1) {
      this.stateHistory.shift();
    }
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
    this.hasStarted = false; // Reset to allow new randomization
    this.shuffledOrder = [];

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
    // Store original items for recalculation during sorting
    this.currentItems = items;

    // Determine items to sort based on whether this is truly the first start
    let itemsToSort: SortItem[];
    
    if (!this.hasStarted) {
      // First time ever - shuffle and store the order
      this.shuffledOrder = shuffleArray(items);
      this.hasStarted = true;
      itemsToSort = this.shuffledOrder;
      
      // Save the new shuffled order immediately
      this.onSaveProgress?.();
    } else {
      // Already started (saved progress or undo) - use consistent order
      itemsToSort = this.shuffledOrder.length > 0 ? this.shuffledOrder : items;
    }

    // Calculate total comparisons needed by simulating the sort first
    this.totalComparisons = this.simulateSort(items);
    this.onProgressUpdate?.(this.comparisonCount, this.totalComparisons);

    return await this.mergeSort(itemsToSort, onNeedComparison);
  }

  private recalculateTotal(): void {
    if (this.currentItems.length > 0) {
      this.totalComparisons = this.simulateSort(this.currentItems);
    }
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
        this.userChoices.set(key, winner);

        // Recalculate total comparisons with the new knowledge
        this.recalculateTotal();

        this.onProgressUpdate?.(this.comparisonCount, this.totalComparisons);
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

  getShuffledOrder(): SortItem[] {
    return this.shuffledOrder;
  }

  setShuffledOrder(shuffledOrder: SortItem[]) {
    this.shuffledOrder = shuffledOrder;
    if (shuffledOrder.length > 0) {
      this.hasStarted = true;
    }
  }
}
