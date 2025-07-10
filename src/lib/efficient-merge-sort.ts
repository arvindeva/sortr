// Efficient merge sort that only asks for comparisons when needed
import { SortItem } from "./sorting";

export interface ComparisonRequest {
  itemA: SortItem;
  itemB: SortItem;
  onResult: (winnerId: string) => void;
}

export interface EfficientSortState {
  items: SortItem[];
  userChoices: Map<string, string>;
  isComplete: boolean;
  result: SortItem[];
  currentComparison: ComparisonRequest | null;
  totalComparisons: number;
  completedComparisons: number;
}

function getComparisonKey(itemA: SortItem, itemB: SortItem): string {
  return [itemA.id, itemB.id].sort().join(',');
}

function getUserPreference(
  itemA: SortItem, 
  itemB: SortItem, 
  userChoices: Map<string, string>
): string | null {
  const key = getComparisonKey(itemA, itemB);
  return userChoices.get(key) || null;
}

class MergeSortController {
  private items: SortItem[];
  private userChoices: Map<string, string>;
  private onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>;
  private comparisonCount = 0;

  constructor(
    items: SortItem[], 
    userChoices: Map<string, string>,
    onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>
  ) {
    this.items = items;
    this.userChoices = userChoices;
    this.onNeedComparison = onNeedComparison;
  }

  async sort(): Promise<SortItem[]> {
    return await this.mergeSort(this.items);
  }

  private async mergeSort(items: SortItem[]): Promise<SortItem[]> {
    if (items.length <= 1) return items;

    const mid = Math.floor(items.length / 2);
    const left = await this.mergeSort(items.slice(0, mid));
    const right = await this.mergeSort(items.slice(mid));

    return await this.merge(left, right);
  }

  private async merge(left: SortItem[], right: SortItem[]): Promise<SortItem[]> {
    const result: SortItem[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const leftItem = left[leftIndex];
      const rightItem = right[rightIndex];
      
      // Check if we already know the preference
      let winner = getUserPreference(leftItem, rightItem, this.userChoices);
      
      if (!winner) {
        // Need user input for this comparison
        this.comparisonCount++;
        winner = await this.onNeedComparison(leftItem, rightItem);
        // Cache the result
        const key = getComparisonKey(leftItem, rightItem);
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
}

export function initializeEfficientSort(items: SortItem[]): EfficientSortState {
  // Estimate total comparisons (this is just an estimate)
  const estimatedComparisons = items.length <= 1 ? 0 : Math.ceil(items.length * Math.log2(items.length));
  
  return {
    items,
    userChoices: new Map(),
    isComplete: false,
    result: [],
    currentComparison: null,
    totalComparisons: estimatedComparisons,
    completedComparisons: 0,
  };
}

export function startEfficientSort(
  state: EfficientSortState,
  onComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>
): Promise<SortItem[]> {
  const controller = new MergeSortController(state.items, state.userChoices, onComparison);
  return controller.sort();
}