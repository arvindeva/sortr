export interface ExistingItemSnapshot {
  id: string;
  title: string;
  imageUrl: string | null;
}

/**
 * Which existing image an edited item keeps (edit/finalize, when the item has
 * no fresh upload). Item rows are deleted and re-inserted with new UUIDs on
 * every edit, so an itemId from the edit form is only valid until the next
 * save — a stale form (back button, second tab, re-save after a save already
 * committed) sends IDs that match nothing. Title fallback must therefore
 * ALWAYS run on an ID miss, never only when the ID is absent: the Aug 24 2026
 * incident nulled 300+ images because the miss branch went straight to null.
 */
export function resolveEditedItemImageUrl(
  item: { title: string; itemId?: string },
  currentItems: ExistingItemSnapshot[],
): string | null {
  if (item.itemId) {
    const byId = currentItems.find((ci) => ci.id === item.itemId)?.imageUrl;
    if (byId) return byId;
  }
  return (
    currentItems.find(
      (ci) => ci.title.toLowerCase() === item.title.toLowerCase(),
    )?.imageUrl || null
  );
}
