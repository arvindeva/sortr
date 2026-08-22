import { SortItem } from "@/lib/sorting";

/**
 * Sentinel "winner" recorded when the user calls a comparison a tie. Lives in
 * the same choices map as real winner ids, which is what makes ties survive
 * undo, save/resume, and replay with zero extra state: the map is already
 * snapshotted and serialized everywhere it needs to be.
 */
export const TIE = "__tie__";

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
  totalBattles: number;
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
  private totalBattles = 0; // Fixed total battles calculated at start
  private sortedNo = 0; // Number of items placed in merged lists
  private stateHistory: SortState[] = [];
  private currentItems: SortItem[] = [];
  private hasStarted = false;
  private shuffledOrder: SortItem[] = [];
  private onProgressUpdate?: (completed: number, total: number) => void;
  private onSaveProgress?: () => void;
  private onRestartRequested?: () => void;
  private isReplaying = false; // true while re-simulating to next unknown comparison

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
      totalBattles: this.totalBattles,
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
    this.totalBattles = previousState.totalBattles;

    this.updateProgress();
    this.onSaveProgress?.();
    // After an undo, the UI may have an unresolved comparison promise.
    // Signal a controlled restart so the consumer can safely re-drive the loop.
    this.onRestartRequested?.();
    
    return true;
  }

  reset() {
    this.userChoices.clear();
    this.comparisonCount = 0;
    this.sortedNo = 0;
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

      // Save the new shuffled order immediately
      this.onSaveProgress?.();
    } else {
      // Already started (saved progress or undo) - use consistent order
      itemsToSort = this.shuffledOrder.length > 0 ? this.shuffledOrder : items;
    }

    // Progress counters are DERIVED per drive, never trusted from saves or
    // carried across restarts: totalBattles is a pure function of the current
    // item count, and sortedNo recounts from zero as the replay re-places
    // every item under the current choice set. The old approach persisted
    // both and gated counting on !isReplaying — after removeItem() pruned
    // choices, the restart replay re-counted placements that were already
    // counted, sortedNo overshot totalBattles (sim: 1244/672 after one
    // removal), and the bar pinned at 99% for the rest of a long sort
    // (user report: "stuck at 99% the whole time" on an 870-item sorter).
    this.totalBattles = this.calculateTotalBattles(itemsToSort.length);
    this.sortedNo = 0;

    // Update progress display
    this.updateProgress();

    // When (re)starting, we initially replay known decisions to reach the next unknown
    this.isReplaying = true;
    const result = await this.mergeSort(itemsToSort, onNeedComparison);
    
    // Set to 100% when complete
    this.onProgressUpdate?.(this.comparisonCount, 100);
    
    return result;
  }

  // Charasort-style progress: sortedNo vs totalBattles, capped at 99%
  private updateProgress(): void {
    const progress = this.totalBattles > 0 
      ? Math.min(MAX_PROGRESS_PERCENT, Math.floor((this.sortedNo / this.totalBattles) * 100))
      : 0;
    
    this.onProgressUpdate?.(this.comparisonCount, progress);
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
        // Reached the frontier of known choices — replay is over. Sync the
        // bar BEFORE awaiting the user, so it shows the replayed progress
        // while they look at their first duel of this drive.
        if (this.isReplaying) {
          this.isReplaying = false;
          this.updateProgress();
        }

        // Need user input for this comparison
        winner = await onNeedComparison(leftItem, rightItem);

        // Save state snapshot AFTER the comparison is made
        this.saveStateSnapshot();

        this.comparisonCount++;
        this.userChoices.set(key, winner);
      }

      if (winner === TIE) {
        // Both advance as equals, adjacently. Place the left item with its
        // consecutive tie-mates, bridge the chain to the right item with a
        // synthetic tie record (keeps the "consecutive tied items always
        // have a pairwise TIE record" invariant across group joins), then
        // place the right item with its mates.
        leftIndex = this.placeWithTieMates(left, leftIndex, result);
        const lastPlaced = result[result.length - 1];
        this.userChoices.set(getComparisonKey(lastPlaced, rightItem), TIE);
        rightIndex = this.placeWithTieMates(right, rightIndex, result);
      } else if (winner === leftItem.id) {
        leftIndex = this.placeWithTieMates(left, leftIndex, result);
      } else {
        rightIndex = this.placeWithTieMates(right, rightIndex, result);
      }

      // One save per resolved comparison (covering every placement it
      // caused); progress updates happen per placement inside the helper.
      if (!this.isReplaying) {
        this.onSaveProgress?.();
      }
    }

    // Add remaining items and increment sortedNo for each (like charasort)
    while (leftIndex < left.length) {
      result.push(left[leftIndex]);
      leftIndex++;
      this.sortedNo++;
      if (!this.isReplaying) {
        this.updateProgress();
      }
    }
    while (rightIndex < right.length) {
      result.push(right[rightIndex]);
      rightIndex++;
      this.sortedNo++;
      if (!this.isReplaying) {
        this.updateProgress();
      }
    }

    return result;
  }

  /**
   * Place run[idx] into the result, then keep placing consecutive tie-mates
   * behind it — items whose pairwise record with the previously placed one is
   * TIE — with no comparison asked ("tie-mates travel together", charasort
   * semantics: this is why ties SHORTEN a sort). Returns the new run index.
   * Every placement counts toward progress.
   */
  private placeWithTieMates(
    run: SortItem[],
    idx: number,
    result: SortItem[],
  ): number {
    let placed = run[idx];
    result.push(placed);
    this.sortedNo++;
    if (!this.isReplaying) this.updateProgress();
    idx++;
    while (
      idx < run.length &&
      this.userChoices.get(getComparisonKey(placed, run[idx])) === TIE
    ) {
      placed = run[idx];
      result.push(placed);
      this.sortedNo++;
      if (!this.isReplaying) this.updateProgress();
      idx++;
    }
    return idx;
  }

  /**
   * tiedWithPrev flag per index of a final result order — true when the item
   * is tied with its predecessor. Consumed when building the stored ranking
   * (competition ranks 1-2-2-4 derive from these downstream).
   */
  getTieFlags(result: SortItem[]): boolean[] {
    return result.map((item, i) =>
      i === 0
        ? false
        : this.userChoices.get(getComparisonKey(result[i - 1], item)) === TIE,
    );
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
    
    // Clean up all comparisons involving this item
    for (const [key, winnerId] of this.userChoices) {
      const [id1, id2] = key.split(',');
      if (id1 === itemId || id2 === itemId) {
        this.userChoices.delete(key);
      }
    }
    
    // DON'T clean up state history - leave it intact for undo support
    // The undo system can handle states with non-existent items gracefully
    
    // Recalculate comparison count from cleaned userChoices
    this.comparisonCount = this.userChoices.size;
    
    // Update progress display
    this.updateProgress();
    this.onSaveProgress?.(); // Save updated state
    
    // Restart sorting with cleaned state
    this.onRestartRequested?.();
  }
}
