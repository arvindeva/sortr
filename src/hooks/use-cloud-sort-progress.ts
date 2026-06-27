import { useCallback, useEffect, useRef, useState } from "react";

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "local" | "error";

interface ServerProgress {
  state: string;
  version: number;
  itemCount: number;
  updatedAt: string;
  versionMismatch: boolean;
}

/**
 * Cloud sync for a logged-in user's in-progress sort. localStorage remains the
 * per-matchup write-buffer (handled in the sort page); this layer checkpoints
 * the latest compressed blob to the server every 30s, when the tab is
 * backgrounded, when connectivity returns, and on manual save. Each save is a
 * full snapshot (upsert), so offline gaps self-heal — the next successful save
 * carries everything.
 *
 * Disabled (no-ops) when `enabled` is false (anonymous users).
 */
export function useCloudSortProgress({
  enabled,
  sorterId,
  getState,
  getItemCount,
}: {
  enabled: boolean;
  sorterId: string;
  /** Returns the current compressed state blob, or null if nothing to save. */
  getState: () => string | null;
  getItemCount: () => number;
}) {
  const [status, setStatus] = useState<CloudSyncStatus>("idle");
  // The last blob we successfully pushed, to skip redundant saves.
  const lastSavedRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const save = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!enabled || !sorterId) return;
      const state = getState();
      if (!state) return;
      if (!opts?.force && state === lastSavedRef.current) return; // no change
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setStatus("syncing");
      try {
        const res = await fetch("/api/sort-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sorterId,
            state,
            itemCount: getItemCount(),
          }),
        });
        if (!res.ok) throw new Error(`save failed: ${res.status}`);
        lastSavedRef.current = state;
        setStatus("synced");
      } catch {
        // Offline or server error — localStorage still has it; the next tick or
        // the `online` event will retry with the full latest snapshot.
        setStatus("local");
      } finally {
        inFlightRef.current = false;
      }
    },
    [enabled, sorterId, getState, getItemCount],
  );

  // Periodic checkpoint (30s) + save when backgrounded + save on reconnect.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => void save(), 30_000);
    const onHidden = () => {
      if (document.visibilityState === "hidden") void save();
    };
    const onOnline = () => void save({ force: true });
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, save]);

  /** Clear the server-side progress (on completion). */
  const clear = useCallback(async () => {
    if (!enabled || !sorterId) return;
    try {
      await fetch(`/api/sort-progress/${sorterId}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
  }, [enabled, sorterId]);

  return { status, save, clear };
}

/** Fetch the user's saved server progress for a sorter (for resume). */
export async function fetchServerProgress(
  sorterId: string,
): Promise<ServerProgress | null> {
  try {
    const res = await fetch(`/api/sort-progress/${sorterId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.progress ?? null;
  } catch {
    return null;
  }
}
