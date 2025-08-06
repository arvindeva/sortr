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
  sortedNo: number;
}

export interface SortOptions {
  savedChoices?: Map<string, string>;
  savedComparisonCount?: number;
  savedStateHistory?: SortState[];
  savedTotalBattles?: number;
  savedSortedNo?: number;
}

// Animation constants
const REMOVAL_ANIMATION_DURATION = 800; // 0.8 seconds
const REMOVAL_ANIMATION_STEPS = 20;
const MAX_PROGRESS_PERCENT = 99;

export class InteractiveMergeSort {
  private userChoices = new Map<string, string>();
  private comparisonCount = 0;
  private totalBattles = 0; // Fixed total battles calculated at start (like charasort)
  private sortedNo = 0; // Number of items placed in merged lists (like charasort)
  private stateHistory: SortState[] = [];
  private currentItems: SortItem[] = [];
  private hasStarted = false;
  private shuffledOrder: SortItem[] = [];
  private animatedSortedNo = 0; // For smooth removal animations
  private isAnimating = false;
  private onProgressUpdate?: (completed: number, total: number) => void;
  private onSaveProgress?: () => void;
  private onRestartRequested?: () => void;

  constructor(options: SortOptions = {}) {
    const {
      savedChoices,
      savedComparisonCount = 0,
      savedStateHistory,
      savedTotalBattles,
      savedSortedNo,
    } = options;

    if (savedChoices) {
      this.userChoices = new Map(savedChoices);
      this.hasStarted = true; // If we have saved choices, sorting has started
    }
    this.comparisonCount = savedComparisonCount;
    if (savedStateHistory) {
      this.stateHistory = savedStateHistory;
    }
    if (savedTotalBattles !== undefined) {
      this.totalBattles = savedTotalBattles;
    }
    if (savedSortedNo !== undefined) {
      this.sortedNo = savedSortedNo;
      this.animatedSortedNo = savedSortedNo;
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

  // Calculate total battles exactly like charasort does
  private calculateTotalBattles(itemCount: number): number {
    if (itemCount <= 1) return 0;

    let total = 0;
    const countBattles = (len: number) => {
      if (len <= 1) return;
      const mid = Math.ceil(len / 2);
      const leftLen = mid;
      const rightLen = len - mid;

      // Add both halves (what charasort actually does)
      total += leftLen + rightLen;
      countBattles(leftLen);
      countBattles(rightLen);
    };

    countBattles(itemCount);
    return total;
  }

  private saveStateSnapshot() {
    this.stateHistory.push({
      userChoices: new Map(this.userChoices),
      comparisonCount: this.comparisonCount,
      sortedNo: this.sortedNo,
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
    this.sortedNo = previousState.sortedNo;
    this.animatedSortedNo = this.sortedNo;

    // Update progress display  
    this.updateProgress();
    this.onSaveProgress?.();

    // Request restart of sorting from current state
    this.onRestartRequested?.();

    return true;
  }

  reset() {
    this.userChoices.clear();
    this.comparisonCount = 0;
    this.sortedNo = 0;
    this.animatedSortedNo = 0;
    this.stateHistory = [];
    this.hasStarted = false; // Reset to allow new randomization
    this.shuffledOrder = [];

    // Reset progress
    this.updateProgress();
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

      // Calculate total battles ONCE - NEVER changes (like charasort)
      if (this.totalBattles === 0) {
        this.totalBattles = this.calculateTotalBattles(items.length);
      }

      // Save the new shuffled order immediately
      this.onSaveProgress?.();
    } else {
      // Already started (saved progress or undo) - use consistent order
      itemsToSort = this.shuffledOrder.length > 0 ? this.shuffledOrder : items;
      
      // If totalBattles wasn't saved (legacy save), recalculate it
      if (this.totalBattles === 0) {
        this.totalBattles = this.calculateTotalBattles(items.length);
      }
    }

    // Update progress display
    this.updateProgress();

    const result = await this.mergeSort(itemsToSort, onNeedComparison);
    
    // Set to 100% when complete
    this.onProgressUpdate?.(this.comparisonCount, 100);
    
    return result;
  }

  // Charasort-style progress: sortedNo vs totalBattles, capped at 99%
  private updateProgress(): void {
    const progress = this.totalBattles > 0 
      ? Math.min(MAX_PROGRESS_PERCENT, Math.floor((this.animatedSortedNo / this.totalBattles) * 100))
      : 0;
    this.onProgressUpdate?.(this.comparisonCount, progress);
  }

  // Smoothly animate sortedNo increases (for removals)
  private animateSortedNoIncrease(targetSortedNo: number): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const startValue = this.animatedSortedNo;
    const increment = targetSortedNo - startValue;
    const stepIncrement = increment / REMOVAL_ANIMATION_STEPS;
    const stepDuration = REMOVAL_ANIMATION_DURATION / REMOVAL_ANIMATION_STEPS;
    
    let currentStep = 0;
    
    const animate = () => {
      currentStep++;
      this.animatedSortedNo = Math.min(targetSortedNo, startValue + (stepIncrement * currentStep));
      this.updateProgress();
      
      if (currentStep < REMOVAL_ANIMATION_STEPS && this.animatedSortedNo < targetSortedNo) {
        setTimeout(animate, stepDuration);
      } else {
        this.animatedSortedNo = targetSortedNo;
        this.isAnimating = false;
        this.updateProgress();
      }
    };
    
    animate();
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
      }

      if (winner === leftItem.id) {
        result.push(leftItem);
        leftIndex++;
      } else {
        result.push(rightItem);
        rightIndex++;
      }

      // Increment sortedNo for each item placed (like charasort)
      this.sortedNo++;
      this.animatedSortedNo = this.sortedNo;
      this.updateProgress();
      this.onSaveProgress?.(); // Save progress after updating count
    }

    // Add remaining items and increment sortedNo for each (like charasort)
    while (leftIndex < left.length) {
      result.push(left[leftIndex]);
      leftIndex++;
      this.sortedNo++;
      this.animatedSortedNo = this.sortedNo;
      this.updateProgress(); // Update immediately like charasort
    }
    while (rightIndex < right.length) {
      result.push(right[rightIndex]);
      rightIndex++;
      this.sortedNo++;
      this.animatedSortedNo = this.sortedNo;
      this.updateProgress(); // Update immediately like charasort
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

  getTotalBattles(): number {
    return this.totalBattles;
  }

  getSortedNo(): number {
    return this.sortedNo;
  }

  removeItem(itemId: string): void {
    // Save state snapshot BEFORE removal for undo support
    this.saveStateSnapshot();
    
    // Remove item from item arrays
    this.currentItems = this.currentItems.filter(item => item.id !== itemId);
    this.shuffledOrder = this.shuffledOrder.filter(item => item.id !== itemId);
    
    // Count how many comparisons involved this item (for progress animation)
    let removedComparisons = 0;
    
    // Clean up all comparisons involving this item
    for (const [key, winnerId] of this.userChoices) {
      const [id1, id2] = key.split(',');
      if (id1 === itemId || id2 === itemId) {
        this.userChoices.delete(key);
        removedComparisons++;
      }
    }
    
    // DON'T clean up state history - leave it intact for undo support
    // The undo system can handle states with non-existent items gracefully
    
    // Recalculate comparison count from cleaned userChoices (avoid off-by-one errors)
    this.comparisonCount = this.userChoices.size;
    
    // Increase sortedNo based on removed comparisons
    // Each removed comparison represents work that no longer needs to be done
    // We approximate this as removing ~ 1-2 work units per comparison
    const workSaved = Math.floor(removedComparisons * 1.5);
    const newSortedNo = Math.min(this.totalBattles, this.sortedNo + workSaved);
    
    // Animate the progress increase smoothly instead of jumping
    if (newSortedNo > this.sortedNo) {
      this.sortedNo = newSortedNo;
      this.animateSortedNoIncrease(newSortedNo);
    } else {
      this.updateProgress();
    }
    
    this.onSaveProgress?.(); // Save updated state
    
    // Restart sorting with cleaned state
    this.onRestartRequested?.();
  }
}
