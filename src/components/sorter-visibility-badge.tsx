"use client";

import { useIsSorterOwner } from "@/components/sorter-owner-controls";

interface SorterVisibilityBadgeProps {
  ownerUserId: string;
  visibility?: string;
}

/**
 * Small HUD label (UNLISTED / PRIVATE) shown next to the title, owner-only.
 * The sorter page is ISR-cached with no session, so this can't be baked into
 * the server-rendered header — it resolves client-side after hydration,
 * reusing the same ownership check as SorterOwnerControls. Renders nothing
 * for public sorters or non-owner visitors (including everyone during SSR).
 */
export function SorterVisibilityBadge({
  ownerUserId,
  visibility,
}: SorterVisibilityBadgeProps) {
  const isOwner = useIsSorterOwner(ownerUserId);

  if (!isOwner || !visibility || visibility === "public") return null;

  return (
    <span className="hud ml-2 inline-block rounded-md border border-border bg-background/80 px-1.5 py-0.5 align-middle text-[10px] text-muted-foreground backdrop-blur-sm">
      {visibility}
    </span>
  );
}
