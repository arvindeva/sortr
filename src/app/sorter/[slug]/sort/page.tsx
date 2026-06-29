"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, signIn } from "next-auth/react";
import {
  useCloudSortProgress,
  fetchServerProgress,
} from "@/hooks/use-cloud-sort-progress";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useImagePreloader } from "@/hooks/use-image-preloader";
import { ComparisonCard } from "@/components/ui/comparison-card";
import { VsMarker } from "@/components/ui/sortr-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Undo2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { SortItem } from "@/lib/sorting";
import { InteractiveMergeSort, SortState } from "@/lib/interactive-merge-sort";
import { generateProgressKey, serializeChoices, deserializeChoices } from "@/lib/sort-persistence";
import LZString from "lz-string";
import { Box } from "@/components/ui/box";
import { SortPageSkeleton } from "@/components/sort-page-skeleton";
import { Spinner } from "@/components/ui/spinner";
import { track } from "@/lib/analytics";

interface SorterData {
  sorter: {
    id: string;
    title: string;
    description: string;
    slug: string;
    version?: number; // Version this sort was loaded against
    useGroups?: boolean; // Optional for backward compatibility
  };
  items: (SortItem & { tagSlugs?: string[] })[];
  groups?: {
    id: string;
    name: string;
    slug: string;
    items: SortItem[];
  }[];
  tags?: {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    items: SortItem[];
  }[];
}

interface ComparisonState {
  itemA: SortItem;
  itemB: SortItem;
}

async function fetchSorterData(sorterSlug: string): Promise<SorterData> {
  const response = await fetch(`/api/sorters/${sorterSlug}`);
  if (!response.ok) throw new Error("Failed to fetch sorter");
  return response.json();
}

// Extract all image URLs from items for preloading
function extractImageUrls(items: SortItem[]): string[] {
  const imageUrls: string[] = [];

  items.forEach((item) => {
    // Add item image if available
    if (item.imageUrl) {
      imageUrls.push(item.imageUrl);
    }
  });

  // Remove duplicates
  return [...new Set(imageUrls)];
}

// (persistence helpers imported from @/lib/sort-persistence)

export default function SortPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sorterSlug = params.slug as string;
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [currentComparison, setCurrentComparison] =
    useState<ComparisonState | null>(null);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  // Progress-save status, shown to the user so a failed save is never silent
  // (the original "thought it saved, lost 6 hours" bug).
  const [saveStatus, setSaveStatus] = useState<"saved" | "error">("saved");
  // For logged-in users: gate sorter init until we've checked the server for
  // saved progress (so a cross-device resume isn't clobbered by empty local).
  const isLoggedIn = !!session?.user?.id;
  const [serverHydrated, setServerHydrated] = useState(false);
  const serverHydrateStartedRef = useRef(false);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [filteredItems, setFilteredItems] = useState<SortItem[]>([]);
  const [currentFilterSlugs, setCurrentFilterSlugs] = useState<string[]>([]);
  const [sorterId, setSorterId] = useState<string>("");
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  // The sorter's items changed since this saved progress — ask the user whether
  // to continue (with surviving items) or start fresh. null = not yet asked.
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionChoice, setVersionChoice] = useState<
    "continue" | "fresh" | null
  >(null);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; title: string } | null>(null);
  const sorterRef = useRef<InteractiveMergeSort | null>(null);
  const resolveComparisonRef = useRef<((winnerId: string) => void) | null>(
    null,
  );
  const isRestartingRef = useRef(false);
  // Ensures sort_started fires once per attempt, not on every effect re-run,
  // resume, or restart (which would massively inflate the funnel denominator).
  const sortStartedTrackedRef = useRef(false);

  // Image preloader
  const {
    progress: preloadProgress,
    preloadImages,
    reset: resetPreloader,
  } = useImagePreloader();

  // Fetch sorter data with TanStack Query
  const {
    data: sorterData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sorter", sorterSlug],
    queryFn: () => fetchSorterData(sorterSlug),
    retry: 1,
  });

  // Process filtered items when data loads
  useEffect(() => {
    if (sorterData) {
      let itemsToSort = sorterData.items;
      let filterSlugs: string[] = [];

      // Check for tag-based filtering first (new system)
      if (sorterData.tags && sorterData.tags.length > 0) {
        const tagsParam = searchParams.get("tags");

        if (tagsParam) {
          try {
            const selectedTagSlugs = tagsParam
              .split(",")
              .filter((slug) => slug.trim());

            if (selectedTagSlugs.length === 0) {
              itemsToSort = sorterData.items;
              filterSlugs = [];
            } else {
              // Filter items that have any of the selected tags
              itemsToSort = sorterData.items.filter((item) => {
                // Include items that have any of the selected tags
                const matchingTags = sorterData.tags!.filter((tag) =>
                  selectedTagSlugs.includes(tag.slug),
                );
                const tagItemIds = new Set(
                  matchingTags.flatMap((tag) =>
                    tag.items.map((item) => item.id),
                  ),
                );

                // Also include items with no tags (empty tagSlugs array) - they appear in all filters
                const hasMatchingTag = tagItemIds.has(item.id);
                const isUntagged = !item.tagSlugs || item.tagSlugs.length === 0;

                return hasMatchingTag || isUntagged;
              });
              filterSlugs = selectedTagSlugs;
            }
          } catch (error) {
            console.error("Failed to parse selected tags:", error);
            itemsToSort = sorterData.items;
            filterSlugs = [];
          }
        } else {
          // No tags param, default to all items
          itemsToSort = sorterData.items;
          filterSlugs = [];
        }
      }
      // Fallback to group-based filtering (legacy system)
      else if (sorterData.sorter.useGroups && sorterData.groups) {
        const groupsParam = searchParams.get("groups");

        if (groupsParam) {
          try {
            const selectedGroupSlugs = groupsParam
              .split(",")
              .filter((slug) => slug.trim());

            if (selectedGroupSlugs.length === 0) {
              itemsToSort = sorterData.items;
              filterSlugs = [];
            } else {
              // Filter items to only include those from selected groups
              itemsToSort = sorterData.groups
                .filter((group) => selectedGroupSlugs.includes(group.slug))
                .flatMap((group) => group.items);
              filterSlugs = selectedGroupSlugs;
            }
          } catch (error) {
            console.error("Failed to parse selected groups:", error);
            itemsToSort = sorterData.items;
            filterSlugs = [];
          }
        } else {
          // No groups param, default to all items
          itemsToSort = sorterData.items;
          filterSlugs = [];
        }
      }

      setFilteredItems(itemsToSort);
      setCurrentFilterSlugs(filterSlugs);
      setSorterId(sorterData.sorter.id);
    }
  }, [sorterData, router, searchParams]);

  // Preload images when filtered items change
  useEffect(() => {
    if (filteredItems.length > 0) {
      const imageUrls = extractImageUrls(filteredItems);

      if (imageUrls.length > 0) {
        setImagesPreloaded(false);
        resetPreloader();

        // Set up timeout to proceed even if preloading takes too long (10 seconds)
        const timeoutId = setTimeout(() => {
          console.warn("Image preloading timed out, proceeding with sorting");
          setImagesPreloaded(true);
        }, 10000);

        preloadImages(imageUrls)
          .then(() => {
            clearTimeout(timeoutId);
            setImagesPreloaded(true);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            console.warn("Some images failed to preload:", error);
            // Still allow sorting to proceed even if some images fail
            setImagesPreloaded(true);
          });
      } else {
        // No images to preload
        setImagesPreloaded(true);
      }
    } else {
      // Reset preloading state when no items
      setImagesPreloaded(false);
    }
  }, [filteredItems, preloadImages, resetPreloader]);

  // Cloud sync (logged-in only): checkpoints the current localStorage blob to
  // the server every 30s / on background / on reconnect / on manual save.
  const cloudSync = useCloudSortProgress({
    enabled: isLoggedIn,
    sorterId,
    getState: useCallback(() => {
      if (!sorterId) return null;
      return localStorage.getItem(
        generateProgressKey(sorterId, currentFilterSlugs),
      );
    }, [sorterId, currentFilterSlugs]),
    getItemCount: useCallback(() => filteredItems.length, [filteredItems]),
  });

  // Anon → login migration: when a guest signs in mid-sort (via the nudge),
  // immediately push their localStorage progress to the server so the work that
  // motivated the sign-up isn't left only on-device.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (isLoggedIn && sorterId && !migratedRef.current && sorterRef.current) {
      migratedRef.current = true;
      void cloudSync.save({ force: true });
    }
  }, [isLoggedIn, sorterId, cloudSync]);

  // Server-hydration: for a logged-in user, before initializing the sorter,
  // check the server for saved progress. If this device's localStorage is empty
  // for this sorter (cross-device / cache-cleared), pull the server copy down
  // into localStorage so the existing resume logic picks it up transparently.
  useEffect(() => {
    if (serverHydrated || serverHydrateStartedRef.current) return;
    if (!sorterData || filteredItems.length === 0 || !sorterId) return;

    if (!isLoggedIn) {
      // Anonymous — nothing to hydrate; proceed immediately.
      setServerHydrated(true);
      return;
    }

    serverHydrateStartedRef.current = true;
    (async () => {
      try {
        const key = generateProgressKey(sorterId, currentFilterSlugs);
        const local = localStorage.getItem(key);
        const server = await fetchServerProgress(sorterId);

        // Cross-device / cache-cleared: pull the server copy into localStorage
        // so the existing resume logic picks it up. We do this even on a version
        // mismatch — the init effect's item-set check then surfaces the
        // "sorter updated: continue or start fresh" dialog (the user decides; we
        // never silently discard their work).
        if (!local && server?.state) {
          localStorage.setItem(key, server.state);
        }
      } catch {
        // ignore — fall back to local/empty
      } finally {
        setServerHydrated(true);
      }
    })();
  }, [
    serverHydrated,
    isLoggedIn,
    sorterData,
    filteredItems.length,
    sorterId,
    currentFilterSlugs,
  ]);

  // Initialize sorting when data loads and images are preloaded
  useEffect(() => {
    if (
      sorterData &&
      filteredItems.length > 0 &&
      imagesPreloaded &&
      serverHydrated &&
      !sorting &&
      !sorterRef.current
    ) {
      // Check for saved progress using filter-specific key
      const progressKey = generateProgressKey(sorterId, currentFilterSlugs);
      const savedState = localStorage.getItem(progressKey);
      let savedChoices: Map<string, string> | undefined;
      let savedComparisonCount = 0;
      let savedStateHistory: SortState[] | undefined;
      let savedShuffledOrder: SortItem[] | undefined;
      let savedTotalBattles: number | undefined;
      let savedSortedNo: number | undefined;

      if (savedState) {
        try {
          // Decompress the saved state
          const decompressed =
            LZString.decompressFromEncodedURIComponent(savedState);
          if (decompressed) {
            const parsed = JSON.parse(decompressed);
            savedComparisonCount = parsed.completedComparisons || 0;

            // Handle new optimized format
            if (parsed.optimized) {
              const {
                userChoices,
                stateHistory,
                shuffledOrder,
                totalBattles,
                sortedNo,
                staleItems,
              } = deserializeChoices(parsed, filteredItems);

              // The sorter's items changed since this was saved. Ask the user
              // (don't decide for them — they may be happy to finish what they
              // started). Pause init until they choose.
              if (staleItems && versionChoice === null) {
                setShowVersionDialog(true);
                return; // bail out of init; re-runs after the choice
              }

              if (staleItems && versionChoice === "fresh") {
                // Start over on the current sorter.
                localStorage.removeItem(progressKey);
                savedComparisonCount = 0;
              } else if (staleItems && versionChoice === "continue") {
                // Continue with surviving items. deserializeChoices already
                // drops removed items from the shuffle and choices, so the
                // restored state is consistent with the current item set.
                // Restore everything (same as a normal resume) so progress
                // recalculates correctly — it self-corrects as the replay runs,
                // like a normal resume does.
                savedChoices = userChoices;
                savedStateHistory = stateHistory;
                savedTotalBattles = totalBattles;
                savedSortedNo = sortedNo;
                savedComparisonCount = userChoices.size;
                if (shuffledOrder.length > 0) {
                  savedShuffledOrder = shuffledOrder;
                }
              } else {
                // No item change — resume exactly as saved.
                savedChoices = userChoices;
                savedStateHistory = stateHistory;
                savedTotalBattles = totalBattles;
                savedSortedNo = sortedNo;
                if (shuffledOrder.length > 0) {
                  savedShuffledOrder = shuffledOrder;
                }
              }
            } else {
              // Legacy format support
              savedChoices = new Map(parsed.userChoicesArray || []);

              // Restore state history if available
              if (parsed.stateHistoryArray) {
                savedStateHistory = parsed.stateHistoryArray.map(
                  (historyState: any) => ({
                    userChoices: new Map(historyState.userChoicesArray || []),
                    comparisonCount: historyState.comparisonCount || 0,
                  }),
                );
              }
            }

            setCompletedComparisons(savedComparisonCount);
          }
        } catch (error) {
          console.error("Failed to parse saved state:", error);
        }
      }

      sorterRef.current = new InteractiveMergeSort({
        savedChoices,
        savedComparisonCount,
        savedStateHistory,
        savedTotalBattles,
        savedSortedNo,
      });

      // Restore shuffled order if available
      if (savedShuffledOrder) {
        sorterRef.current.setShuffledOrder(savedShuffledOrder);
      }

      // Set up progress tracking - simple approach
      sorterRef.current.setProgressCallback((comparisons, progressPercent) => {
        // Small delay to ensure DOM is ready for animation
        setTimeout(() => {
          setCompletedComparisons(comparisons);
          setTotalComparisons(progressPercent);
          setCanUndo(sorterRef.current?.canUndo() || false);
        }, 100);
      });

      // Set up save callback
      sorterRef.current.setSaveCallback(() => {
        if (!sorterRef.current) return;

        // Don't persist an empty sort (0 comparisons made). A reset-and-leave
        // would otherwise create a phantom "in progress" entry that sits in the
        // profile forever. Nothing to resume from, so clear any existing entry
        // (local + cloud) instead of saving an empty one, and refresh the
        // in-progress caches so it doesn't linger there.
        if (sorterRef.current.getComparisonCount() === 0) {
          const key = generateProgressKey(sorterId, currentFilterSlugs);
          localStorage.removeItem(key);
          void cloudSync.clear();
          queryClient.invalidateQueries({ queryKey: ["in-progress-sorts"] });
          queryClient.invalidateQueries({
            queryKey: ["sort-progress", sorterId],
          });
          return;
        }

        try {
          // Use optimized serialization
          const serializedData = serializeChoices(
            filteredItems,
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

          // Compress the state before saving
          const compressed = LZString.compressToEncodedURIComponent(
            JSON.stringify(stateToSave),
          );
          const progressKey = generateProgressKey(sorterId, currentFilterSlugs);
          localStorage.setItem(progressKey, compressed);
          setSaveStatus("saved");
        } catch (err) {
          // setItem can throw on quota exceeded, private-browsing, or iOS
          // storage limits. Surface it instead of silently losing progress —
          // this is the root cause of the "thought it saved, lost hours" bug.
          console.error("Failed to save sort progress:", err);
          setSaveStatus("error");
        }
      });

      // Set up restart callback
      sorterRef.current.setRestartCallback(() => {
        isRestartingRef.current = true;

        // Don't clear comparison immediately - let the new sort set it
        setSorting(false);

        // Force restart after state updates
        setTimeout(() => {
          if (isRestartingRef.current) {
            isRestartingRef.current = false;
            startSorting();
          }
        }, 50);
      });

      startSorting();
    }
  }, [
    sorterData,
    filteredItems,
    imagesPreloaded,
    currentFilterSlugs,
    serverHydrated,
    versionChoice,
  ]);

  const startSorting = useCallback(async () => {
    if (!sorterData || !sorterRef.current || filteredItems.length === 0) return;

    if (sorting) {
      return;
    }

    setSorting(true);

    // A sort session began — denominator for the completion-rate funnel. Fire
    // once per attempt only: effect re-runs, resumes, and restarts all call
    // startSorting() again, and counting each would inflate the denominator.
    if (!sortStartedTrackedRef.current) {
      sortStartedTrackedRef.current = true;
      track("sort_started", {
        sorterId: sorterData.sorter.id,
        itemCount: filteredItems.length,
      });
    }

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

      const result = await sorterRef.current.sort(
        filteredItems,
        onNeedComparison,
      );

      // Save results
      setSaving(true);

      // Get selected filter IDs based on URL parameters and sorter data
      let selectedGroupIds: string[] = [];
      let selectedTagSlugs: string[] = [];

      if (sorterData.tags && sorterData.tags.length > 0) {
        // New tag-based system
        selectedTagSlugs = currentFilterSlugs;
      } else if (
        sorterData.sorter.useGroups &&
        sorterData.groups &&
        currentFilterSlugs.length > 0
      ) {
        // Legacy group-based system - convert group slugs to group IDs
        selectedGroupIds = sorterData.groups
          .filter((group) => currentFilterSlugs.includes(group.slug))
          .map((group) => group.id);
      }

      const response = await fetch("/api/sorting-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sorterId,
          rankings: result,
          selectedGroups: selectedGroupIds, // Legacy support
          selectedTagSlugs: selectedTagSlugs, // New tag support
          // Pin to the version this sort was STARTED against, not the live one.
          // If the creator edited mid-sort, the user ranked the old item set —
          // the result must reflect that (and so be excluded from the current
          // community ranking) rather than masquerade as the new version.
          version: sorterData.sorter.version,
        }),
      });

      if (!response.ok) throw new Error("Failed to save results");

      // A sort was completed and saved — the headline funnel metric.
      track("sort_completed", {
        sorterId,
        itemCount: filteredItems.length,
      });

      const { resultId } = await response.json();

      // Clear saved progress (local + cloud) now the sort is complete.
      const progressKey = generateProgressKey(sorterId, currentFilterSlugs);
      localStorage.removeItem(progressKey);
      void cloudSync.clear();

      // Invalidate sorter data cache to show new ranking in recent rankings
      queryClient.invalidateQueries({
        queryKey: ["sorter", sorterSlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["sorter", sorterSlug, "recent-results"],
      });

      // Invalidate homepage cache since completion count changed (affects popular sorter ordering)
      queryClient.invalidateQueries({
        queryKey: ["homepage", "popular-sorters"],
      });
      queryClient.invalidateQueries({
        queryKey: ["browse"],
      });

      // The just-completed sort is no longer "in progress" — refresh the
      // profile's in-progress list and this sorter's continue-banner check so
      // neither lingers as stale cache.
      queryClient.invalidateQueries({
        queryKey: ["in-progress-sorts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["sort-progress", sorterId],
      });

      // Invalidate user profile cache to show new ranking in user's rankings section
      if (session?.user?.email) {
        queryClient.invalidateQueries({
          queryKey: ["user", session.user.email],
        });
        // Also invalidate username-based queries if we have a username
        queryClient.invalidateQueries({
          queryKey: ["user"],
        });
      }

      // Redirect to results page
      router.push(`/rankings/${resultId}`);
    } catch (error) {
      console.error("Error during sorting:", error);
      setSorting(false);
      setSaving(false);
    }
  }, [
    sorterData,
    filteredItems,
    sorting,
    sorterId,
    router,
    currentFilterSlugs,
  ]);

  const handleChoice = useCallback((winnerId: string) => {
    if (resolveComparisonRef.current) {
      setCurrentComparison(null);
      resolveComparisonRef.current(winnerId);
      resolveComparisonRef.current = null;
    }
  }, []);

  const handleRemoveItem = useCallback((itemId: string, itemTitle: string) => {
    setItemToRemove({ id: itemId, title: itemTitle });
    setShowRemoveDialog(true);
  }, []);

  const confirmRemoveItem = useCallback(() => {
    if (sorterRef.current && itemToRemove) {
      sorterRef.current.removeItem(itemToRemove.id);
      toast.success(`Removed "${itemToRemove.title}" from sorting`);
    }
    setShowRemoveDialog(false);
    setItemToRemove(null);
  }, [itemToRemove]);

  const cancelRemoveItem = useCallback(() => {
    setShowRemoveDialog(false);
    setItemToRemove(null);
  }, []);

  const handleUndo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sorterRef.current && sorterRef.current.canUndo()) {
      // Keep current comparison visible to avoid UI flicker
      // Clear only the resolve function so clicks do nothing during restart
      resolveComparisonRef.current = null;
      
      // Undo will restore state and restart from that point
      sorterRef.current.undo();
    }
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowResetDialog(true);
  }, []);

  // Manual save — reassurance (autosave already runs). Logged-in: force a cloud
  // checkpoint. Anon: a soft, non-forcing nudge to sign in (don't redirect).
  const handleSave = useCallback(async () => {
    if (isLoggedIn) {
      await cloudSync.save({ force: true });
      toast.success("Progress saved to your account.");
    } else {
      toast("Sign in to save your progress to your account", {
        action: { label: "Sign in", onClick: () => signIn() },
      });
    }
  }, [isLoggedIn, cloudSync]);

  // Version-changed dialog choices. Setting versionChoice re-runs the init
  // effect, which then resumes-with-survivors ("continue") or starts fresh.
  const handleVersionContinue = useCallback(() => {
    setVersionChoice("continue");
    setShowVersionDialog(false);
  }, []);

  const handleVersionFresh = useCallback(() => {
    setVersionChoice("fresh");
    setShowVersionDialog(false);
    // Drop the server copy too — they're starting over on the new version.
    if (sorterId) {
      void fetch(`/api/sort-progress/${sorterId}`, { method: "DELETE" });
    }
  }, [sorterId]);

  const confirmReset = useCallback(() => {
    if (sorterRef.current) {
      sorterRef.current.reset();
    }
    setShowResetDialog(false);
  }, []);

  const cancelReset = useCallback(() => {
    setShowResetDialog(false);
  }, []);

  if (isLoading) {
    return <SortPageSkeleton />;
  }

  if (error || !sorterData) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-4 text-center">
          <p className="text-foreground">Failed to load sorter</p>
          <Button onClick={() => router.push(`/sorter/${sorterSlug}`)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-center gap-5 text-center">
          <VsMarker size={56} glyph="★" glyphColor="var(--yellow)" />
          <h1 className="display text-3xl font-black text-foreground">
            Ranking locked
          </h1>
          <p className="font-mono text-[13px] text-cyan-ink">
            tallying your picks — taking you to your results…
          </p>
        </div>
      </div>
    );
  }

  if (!currentComparison) {
    const clearAllSaves = () => {
      try {
        // Get all localStorage keys
        const keys = Object.keys(localStorage);

        // Filter and remove sorting-related keys
        const sortingKeys = keys.filter((key) =>
          key.startsWith("sorting-progress-"),
        );

        sortingKeys.forEach((key) => localStorage.removeItem(key));

        // Show success message and reload
        alert(
          `Cleared ${sortingKeys.length} saved sorting sessions. Reloading page...`,
        );
        window.location.reload();
      } catch (error) {
        console.error("Failed to clear localStorage:", error);
        alert(
          "Failed to clear saves. Please try manually clearing your browser storage.",
        );
      }
    };

    // Show image preloading progress
    const showPreloadProgress = !imagesPreloaded && preloadProgress.total > 0;
    const preloadPercentage =
      preloadProgress.total > 0
        ? Math.round((preloadProgress.loaded / preloadProgress.total) * 100)
        : 0;

    return (
      <>
      {/* Version-changed dialog must render here too — this loading view is
          shown while init is paused waiting for the user's choice. */}
      <Dialog open={showVersionDialog}>
        <DialogContent preventClose>
          <DialogHeader>
            <DialogTitle>This sorter was updated</DialogTitle>
            <DialogDescription>
              The creator changed the items since you started ranking. You can
              finish what you started, or rank the updated version.
              <br />
              <br />
              If you continue, any items the creator removed will drop out, and
              your result won&apos;t count toward the community ranking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="neutral" onClick={handleVersionFresh}>
              Start fresh
            </Button>
            <Button variant="default" onClick={handleVersionContinue}>
              Continue my ranking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="container mx-auto max-w-6xl px-2 py-8 md:px-4">
        <div className="space-y-6 text-center">
          <div>
            {showPreloadProgress ? (
              <>
                <p className="mb-2 text-lg text-foreground">
                  Loading images... {preloadProgress.loaded}/
                  {preloadProgress.total} ({preloadPercentage}%)
                </p>
                <Progress
                  value={preloadPercentage}
                  className="mx-auto mb-4 max-w-md"
                />
                {preloadProgress.failed > 0 && (
                  <p className="text-sm text-destructive">
                    {preloadProgress.failed} image
                    {preloadProgress.failed !== 1 ? "s" : ""} failed to load
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 text-lg text-foreground">
                  Preparing comparison...
                </p>
                <div className="mb-4">
                  <Spinner size={32} />
                </div>
              </>
            )}
          </div>

          <Box variant="warning" size="md" className="mx-auto max-w-md">
            <div className="space-y-3 text-center">
              <p className="font-medium">
                If this screen persists, you may have a browser storage issue.
              </p>
              <p className="text-xs">
                This can happen when storage is full from saved sorting
                progress.
              </p>
              <Button
                variant="neutral"
                size="sm"
                onClick={clearAllSaves}
                className="w-full"
              >
                Clear All Saved Progress
              </Button>
            </div>
          </Box>
        </div>
      </div>
      </>
    );
  }

  // Simple progress - totalComparisons now holds the progress percentage
  const progress = Math.floor(totalComparisons);

  return (
    <div className="container mx-auto max-w-5xl px-0 py-8 text-foreground md:px-6 md:py-12">
      {/* Header — re-add side padding on mobile (the container is edge-to-edge
          so the duel cards can bleed; text shouldn't touch the screen edge). */}
      <div className="mb-7 px-4 md:px-0">
        <h1 className="display text-[clamp(2rem,5.5vw,3.375rem)] font-black text-foreground">
          {sorterData.sorter.title}
        </h1>

        {/* Meta + actions row — sits directly above the progress bar. */}
        <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-muted-foreground">
            <span>
              {completedComparisons} comparison
              {completedComparisons === 1 ? "" : "s"}
            </span>
            {completedComparisons > 0 &&
              (saveStatus === "error" ? (
                <span className="text-destructive">
                  · ⚠ couldn&apos;t save progress
                </span>
              ) : isLoggedIn ? (
                cloudSync.status === "syncing" ? (
                  <span>· saving to your account…</span>
                ) : cloudSync.status === "local" ? (
                  <span className="text-yellow-ink">
                    · saved in browser · syncing to your account…
                  </span>
                ) : cloudSync.status === "synced" ? (
                  <span className="text-cyan-ink">· saved to your account ✓</span>
                ) : (
                  <span className="text-cyan-ink">· saved in browser ✓</span>
                )
              ) : (
                <span className="text-cyan-ink">· saved in browser ✓</span>
              ))}
          </div>
          {/* Undo / Reset / Save — shorter on mobile (h-8/tight padding),
              normal sm size from the sm breakpoint up. */}
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              <Undo2 size={14} />
              Undo
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={handleReset}
              disabled={completedComparisons === 0}
              className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              <RotateCcw size={14} />
              Reset
            </Button>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={handleSave}
              disabled={completedComparisons === 0}
              className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              <Save size={14} />
              Save
            </Button>
          </div>
        </div>

        {/* Progress track — magenta fill with the % centered inside the bar
            (Touhou-style). The label sits on top of both the fill and the track
            so it stays readable at any progress. */}
        <div className="relative mt-4 h-5 w-full overflow-hidden rounded-full border border-border bg-foreground/[0.06] md:h-7">
          <div
            className="bg-main h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold tracking-wide text-white">
            {progress}%
          </span>
        </div>

        {/* Guest notice — anon progress is device-only. Now that logged-in
            users get cloud save, the nudge can honestly promise cross-device. */}
        {!isLoggedIn && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-muted-foreground">
            <span>
              Playing as guest — progress is saved only in this browser.
            </span>
            <button
              type="button"
              onClick={() => signIn()}
              className="text-cyan-ink underline decoration-cyan-ink/40 underline-offset-2 transition-colors hover:text-main-ink"
            >
              Sign in to save it to your account
            </button>
          </div>
        )}
      </div>

      {/* Comparison Cards */}
      {/* The duel is edge-to-edge on mobile (the container is px-0) for the
          largest possible cards. On desktop the grid is capped + centered so
          each card stays near the item images' native 300px (avoids upscaling
          a small source into a big card → blurry). The VS floats over the seam
          (absolute), straddling both cards instead of taking a column. */}
      <div className="relative mt-4 grid grid-cols-2 items-stretch gap-0.5 px-0 md:mx-auto md:max-w-4xl md:gap-24 md:px-0">
        {/* Item A */}
        <ComparisonCard
          side="left"
          imageUrl={currentComparison.itemA.imageUrl}
          title={currentComparison.itemA.title}
          onClick={() => handleChoice(currentComparison.itemA.id)}
          canRemove={filteredItems.length > 1}
          onRemove={() => handleRemoveItem(currentComparison.itemA.id, currentComparison.itemA.title)}
        />

        {/* Item B */}
        <ComparisonCard
          side="right"
          imageUrl={currentComparison.itemB.imageUrl}
          title={currentComparison.itemB.title}
          onClick={() => handleChoice(currentComparison.itemB.id)}
          canRemove={filteredItems.length > 1}
          onRemove={() => handleRemoveItem(currentComparison.itemB.id, currentComparison.itemB.title)}
        />

        {/* VS marker — absolutely centered over the seam, on top of both cards.
            Static (no pulse) so it doesn't distract from the duel. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <VsMarker size={30} pulse={false} className="sm:hidden" />
          <VsMarker size={60} pulse={false} className="hidden sm:flex" />
        </div>
      </div>

      {/* Autosave note */}
      <div className="mt-8 flex flex-col items-center gap-3 px-4 text-center md:px-0">
        <p className="font-mono text-xs text-muted-foreground">
          {isLoggedIn
            ? "✓ progress saved to your account — take a break and come back anytime, on any device."
            : "✓ progress saved in this browser — take a break and come back anytime."}
        </p>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Progress?</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset your progress? This will restart
              the sorting from the beginning and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="neutral" onClick={cancelReset}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmReset}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sorter-updated dialog — items changed since this saved progress. */}
      <Dialog open={showVersionDialog}>
        <DialogContent preventClose>
          <DialogHeader>
            <DialogTitle>This sorter was updated</DialogTitle>
            <DialogDescription>
              The creator changed the items since you started ranking. You can
              finish what you started, or rank the updated version.
              <br />
              <br />
              If you continue, any items the creator removed will drop out, and
              your result won&apos;t count toward the community ranking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="neutral" onClick={handleVersionFresh}>
              Start fresh
            </Button>
            <Button variant="default" onClick={handleVersionContinue}>
              Continue my ranking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Item Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Item?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{itemToRemove?.title}" from this sorting session? 
              This will remove it from all remaining comparisons and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="neutral" onClick={cancelRemoveItem}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmRemoveItem}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
