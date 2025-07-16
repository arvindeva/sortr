// Simplified step-by-step merge sort implementation for React
import { SortItem } from "./sorting";

export interface MergeSortStep {
  type: "compare" | "complete";
  itemA?: SortItem;
  itemB?: SortItem;
  result?: SortItem[];
}

export interface MergeSortState {
  items: SortItem[];
  userChoices: Map<string, string>;
  isComplete: boolean;
  result: SortItem[];
  comparisonsNeeded: Array<{ itemA: SortItem; itemB: SortItem }>;
  currentComparisonIndex: number;
}

function getComparisonKey(itemA: SortItem, itemB: SortItem): string {
  return [itemA.id, itemB.id].sort().join(",");
}

function getUserPreference(
  itemA: SortItem,
  itemB: SortItem,
  userChoices: Map<string, string>,
): string | null {
  const key = getComparisonKey(itemA, itemB);
  return userChoices.get(key) || null;
}

// Generate minimal comparisons needed for merge sort
function generateMergeSortComparisons(
  items: SortItem[],
): Array<{ itemA: SortItem; itemB: SortItem }> {
  if (items.length <= 1) return [];

  const comparisons: Array<{ itemA: SortItem; itemB: SortItem }> = [];

  // Simulate merge sort to find exactly which comparisons we need
  function simulateMergeSort(itemList: SortItem[]): void {
    if (itemList.length <= 1) return;

    const mid = Math.floor(itemList.length / 2);
    const left = itemList.slice(0, mid);
    const right = itemList.slice(mid);

    // Recursively process left and right
    simulateMergeSort(left);
    simulateMergeSort(right);

    // Simulate merge - add potential comparisons
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const leftItem = left[leftIndex];
      const rightItem = right[rightIndex];

      // This comparison will be needed during merge
      comparisons.push({ itemA: leftItem, itemB: rightItem });

      // For simulation, just advance left pointer (arbitrary choice)
      leftIndex++;
    }
  }

  simulateMergeSort(items);
  return comparisons;
}

export function initializeMergeSort(items: SortItem[]): MergeSortState {
  if (items.length <= 1) {
    return {
      items,
      userChoices: new Map(),
      isComplete: true,
      result: items,
      comparisonsNeeded: [],
      currentComparisonIndex: 0,
    };
  }

  const comparisonsNeeded = generateMergeSortComparisons(items);

  return {
    items,
    userChoices: new Map(),
    isComplete: false,
    result: [],
    comparisonsNeeded,
    currentComparisonIndex: 0,
  };
}

export function getNextStep(state: MergeSortState): MergeSortStep {
  if (state.isComplete) {
    return { type: "complete", result: state.result };
  }

  // Safety check for comparisonsNeeded
  if (!state.comparisonsNeeded || !Array.isArray(state.comparisonsNeeded)) {
    console.error("Invalid state: comparisonsNeeded is not an array", state);
    return { type: "complete", result: state.items };
  }

  // Find the next comparison we need
  for (
    let i = state.currentComparisonIndex;
    i < state.comparisonsNeeded.length;
    i++
  ) {
    const comparison = state.comparisonsNeeded[i];
    const existing = getUserPreference(
      comparison.itemA,
      comparison.itemB,
      state.userChoices,
    );

    if (!existing) {
      return {
        type: "compare",
        itemA: comparison.itemA,
        itemB: comparison.itemB,
      };
    }
  }

  // All comparisons are done, compute final result
  const finalResult = performMergeSort(state.items, state.userChoices);

  return {
    type: "complete",
    result: finalResult,
  };
}

export function processComparison(
  state: MergeSortState,
  itemA: SortItem,
  itemB: SortItem,
  winnerId: string,
): MergeSortState {
  // Store the user's choice
  const newUserChoices = new Map(state.userChoices);
  const key = getComparisonKey(itemA, itemB);
  newUserChoices.set(key, winnerId);

  // Safety check for comparisonsNeeded
  if (!state.comparisonsNeeded || !Array.isArray(state.comparisonsNeeded)) {
    console.error(
      "Invalid state in processComparison: comparisonsNeeded is not an array",
      state,
    );
    return {
      ...state,
      userChoices: newUserChoices,
      isComplete: true,
      result: performMergeSort(state.items, newUserChoices),
    };
  }

  // Find the current comparison and move to the next one
  let newComparisonIndex = state.currentComparisonIndex;
  for (
    let i = state.currentComparisonIndex;
    i < state.comparisonsNeeded.length;
    i++
  ) {
    const comparison = state.comparisonsNeeded[i];
    if (getComparisonKey(comparison.itemA, comparison.itemB) === key) {
      newComparisonIndex = i + 1;
      break;
    }
  }

  // Check if we're done
  const isComplete =
    newComparisonIndex >= state.comparisonsNeeded.length ||
    state.comparisonsNeeded
      .slice(newComparisonIndex)
      .every((comp) =>
        getUserPreference(comp.itemA, comp.itemB, newUserChoices),
      );

  let result: SortItem[] = [];
  if (isComplete) {
    result = performMergeSort(state.items, newUserChoices);
  }

  return {
    ...state,
    userChoices: newUserChoices,
    currentComparisonIndex: newComparisonIndex,
    isComplete,
    result,
  };
}

// Perform merge sort with known user preferences
function performMergeSort(
  items: SortItem[],
  userChoices: Map<string, string>,
): SortItem[] {
  if (items.length <= 1) return items;

  const mid = Math.floor(items.length / 2);
  const left = performMergeSort(items.slice(0, mid), userChoices);
  const right = performMergeSort(items.slice(mid), userChoices);

  return merge(left, right, userChoices);
}

function merge(
  left: SortItem[],
  right: SortItem[],
  userChoices: Map<string, string>,
): SortItem[] {
  const result: SortItem[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftItem = left[leftIndex];
    const rightItem = right[rightIndex];
    const winner = getUserPreference(leftItem, rightItem, userChoices);

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
