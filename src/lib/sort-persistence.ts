import { SortItem } from "@/lib/sorting";

// Generate localStorage key based on sorter ID and selected groups/tags
export function generateProgressKey(sorterId: string, filterSlugs: string[]): string {
  if (filterSlugs.length === 0) {
    return `sorting-progress-${sorterId}-all`;
  }
  const sortedSlugs = [...filterSlugs].sort().join("-");
  return `sorting-progress-${sorterId}-${sortedSlugs}`;
}

// Storage optimization: Convert UUID-based choices to indexed format
export function serializeChoices(
  items: SortItem[],
  userChoices: Map<string, string>,
  stateHistory: any[],
  shuffledOrder: SortItem[] = [],
  totalBattles = 0,
  sortedNo = 0,
): any {
  const itemMap = items.map((item) => item.id);
  const itemToIndex = new Map(itemMap.map((id, index) => [id, index]));

  const choices: number[][] = [];
  for (const [key, winnerId] of userChoices.entries()) {
    const [id1, id2] = key.split(",");
    const index1 = itemToIndex.get(id1);
    const index2 = itemToIndex.get(id2);
    const winnerIndex = itemToIndex.get(winnerId);
    if (
      index1 !== undefined &&
      index2 !== undefined &&
      winnerIndex !== undefined
    ) {
      choices.push([index1, index2, winnerIndex]);
    }
  }

  const historyChoices = stateHistory.map((state) => {
    const stateChoices: number[][] = [];
    for (const [key, winnerId] of state.userChoices.entries()) {
      const [id1, id2] = key.split(",");
      const index1 = itemToIndex.get(id1);
      const index2 = itemToIndex.get(id2);
      const winnerIndex = itemToIndex.get(winnerId);
      if (
        index1 !== undefined &&
        index2 !== undefined &&
        winnerIndex !== undefined
      ) {
        stateChoices.push([index1, index2, winnerIndex]);
      }
    }
    return {
      choices: stateChoices,
      comparisonCount: state.comparisonCount,
      sortedNo: state.sortedNo || 0,
      totalBattles: state.totalBattles || 0,
    };
  });

  const shuffledOrderIndexes = shuffledOrder
    .map((item) => {
      const index = itemToIndex.get(item.id);
      return index !== undefined ? index : -1;
    })
    .filter((index) => index !== -1);

  return {
    itemMap,
    choices,
    historyChoices,
    shuffledOrderIndexes,
    totalBattles,
    sortedNo,
  };
}

// Convert indexed format back to UUID-based choices
export function deserializeChoices(
  serializedData: any,
  allItems: SortItem[],
): {
  userChoices: Map<string, string>;
  stateHistory: any[];
  shuffledOrder: SortItem[];
  totalBattles: number;
  sortedNo: number;
} {
  const { itemMap, choices, historyChoices, shuffledOrderIndexes, totalBattles = 0, sortedNo = 0 } =
    serializedData;

  const userChoices = new Map<string, string>();
  for (const [index1, index2, winnerIndex] of choices) {
    const id1 = itemMap[index1];
    const id2 = itemMap[index2];
    const winnerId = itemMap[winnerIndex];
    if (id1 && id2 && winnerId) {
      const key = id1 < id2 ? `${id1},${id2}` : `${id2},${id1}`;
      userChoices.set(key, winnerId);
    }
  }

  const stateHistory = historyChoices.map((historyState: any) => {
    const stateChoices = new Map<string, string>();
    for (const [index1, index2, winnerIndex] of historyState.choices) {
      const id1 = itemMap[index1];
      const id2 = itemMap[index2];
      const winnerId = itemMap[winnerIndex];
      if (id1 && id2 && winnerId) {
        const key = id1 < id2 ? `${id1},${id2}` : `${id2},${id1}`;
        stateChoices.set(key, winnerId);
      }
    }
    return {
      userChoices: stateChoices,
      comparisonCount: historyState.comparisonCount,
      sortedNo: historyState.sortedNo || 0,
      totalBattles: historyState.totalBattles || totalBattles,
    };
  });

  const shuffledOrder: SortItem[] = [];
  if (shuffledOrderIndexes && shuffledOrderIndexes.length > 0) {
    for (const index of shuffledOrderIndexes) {
      const itemId = itemMap[index];
      if (itemId) {
        const fullItem = allItems.find((item) => item.id === itemId);
        if (fullItem) shuffledOrder.push(fullItem);
      }
    }
  }

  return { userChoices, stateHistory, shuffledOrder, totalBattles, sortedNo };
}

