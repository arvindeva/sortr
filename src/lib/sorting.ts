// Merge sort-based ranking algorithm with transitivity
export interface SortItem {
  id: string;
  title: string;
  imageUrl?: string;
}

export interface ComparisonPair {
  itemA: SortItem;
  itemB: SortItem;
}

export interface SortingState {
  items: SortItem[];
  pendingComparisons: ComparisonPair[];
  currentComparison: ComparisonPair | null;
  userChoices: Map<string, string>; // "itemA_id,itemB_id" -> winner_id
  isComplete: boolean;
  finalRankings: SortItem[];
  totalComparisons: number;
  completedComparisons: number;
}

// Shuffle array for randomized initial order
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Create comparison key for caching results
function getComparisonKey(itemA: SortItem, itemB: SortItem): string {
  return [itemA.id, itemB.id].sort().join(',');
}

// Get user preference from cache
function getUserPreference(
  itemA: SortItem, 
  itemB: SortItem, 
  userChoices: Map<string, string>
): string | null {
  const key = getComparisonKey(itemA, itemB);
  return userChoices.get(key) || null;
}

// Merge sort with user comparisons
async function mergeSortWithComparisons(
  items: SortItem[],
  userChoices: Map<string, string>,
  onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>
): Promise<SortItem[]> {
  if (items.length <= 1) return items;

  const mid = Math.floor(items.length / 2);
  const left = await mergeSortWithComparisons(items.slice(0, mid), userChoices, onNeedComparison);
  const right = await mergeSortWithComparisons(items.slice(mid), userChoices, onNeedComparison);

  return await merge(left, right, userChoices, onNeedComparison);
}

// Merge two sorted arrays with user comparisons
async function merge(
  left: SortItem[],
  right: SortItem[],
  userChoices: Map<string, string>,
  onNeedComparison: (itemA: SortItem, itemB: SortItem) => Promise<string>
): Promise<SortItem[]> {
  const result: SortItem[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftItem = left[leftIndex];
    const rightItem = right[rightIndex];

    // Check if we already know the preference
    let winner = getUserPreference(leftItem, rightItem, userChoices);
    
    if (!winner) {
      // Need user input for this comparison
      winner = await onNeedComparison(leftItem, rightItem);
      // Cache the result
      const key = getComparisonKey(leftItem, rightItem);
      userChoices.set(key, winner);
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

// Calculate estimated total comparisons for merge sort
function estimateComparisons(n: number): number {
  if (n <= 1) return 0;
  return Math.ceil(n * Math.log2(n));
}

// Initialize sorting session
export function initializeSorting(items: SortItem[]): SortingState {
  const shuffledItems = shuffleArray([...items]);
  const totalComparisons = estimateComparisons(items.length);
  
  return {
    items: shuffledItems,
    pendingComparisons: [],
    currentComparison: null,
    userChoices: new Map(),
    isComplete: false,
    finalRankings: [],
    totalComparisons,
    completedComparisons: 0,
  };
}

// Start the sorting process (call this when ready to begin)
export function startSorting(state: SortingState): SortingState {
  // We'll generate comparisons on-demand during merge sort
  return {
    ...state,
    currentComparison: null, // Will be set by the sorting algorithm
  };
}

// Process a user choice and continue sorting
export function processChoice(
  state: SortingState,
  winnerId: string
): SortingState {
  if (!state.currentComparison) return state;

  const { itemA, itemB } = state.currentComparison;
  const key = getComparisonKey(itemA, itemB);
  
  // Store the user's choice
  const newUserChoices = new Map(state.userChoices);
  newUserChoices.set(key, winnerId);

  return {
    ...state,
    userChoices: newUserChoices,
    completedComparisons: state.completedComparisons + 1,
    currentComparison: null, // Will be set by the sorting process
  };
}

// Get current comparison (this will be managed by the sorting process)
export function getCurrentComparison(state: SortingState): ComparisonPair | null {
  return state.currentComparison;
}

// Check if we need a comparison for these two items
export function needsComparison(
  itemA: SortItem,
  itemB: SortItem,
  userChoices: Map<string, string>
): boolean {
  return !getUserPreference(itemA, itemB, userChoices);
}

// Set the current comparison that needs user input
export function setCurrentComparison(
  state: SortingState,
  itemA: SortItem,
  itemB: SortItem
): SortingState {
  return {
    ...state,
    currentComparison: { itemA, itemB },
  };
}

// Complete the sorting process
export function completeSorting(
  state: SortingState,
  finalRankings: SortItem[]
): SortingState {
  return {
    ...state,
    isComplete: true,
    finalRankings,
    currentComparison: null,
  };
}

// Get final rankings
export function getFinalRankings(state: SortingState): SortItem[] {
  return state.finalRankings;
}

// Get progress percentage
export function getProgress(state: SortingState): number {
  if (state.totalComparisons === 0) return 100;
  return Math.round((state.completedComparisons / state.totalComparisons) * 100);
}

// Export the merge sort function for use in components
export { mergeSortWithComparisons };