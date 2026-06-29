"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Play } from "lucide-react";

/**
 * Shown on a sorter page when the signed-in user has an in-progress sort for
 * this sorter — a one-tap "continue where you left off". Catches the exact
 * moment they'd otherwise re-start from scratch. Renders nothing when there's
 * no saved progress or the user is logged out.
 */
export function ContinueSortingBanner({
  sorterId,
  slug,
}: {
  sorterId: string;
  slug: string;
}) {
  const { status } = useSession();
  const enabled = status === "authenticated";

  const { data } = useQuery<{
    progress: { itemCount: number; versionMismatch: boolean } | null;
  }>({
    queryKey: ["sort-progress", sorterId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/sort-progress/${sorterId}`);
      if (!res.ok) return { progress: null };
      return res.json();
    },
    staleTime: 30_000,
  });

  const progress = data?.progress;
  // Hide if no progress, or the sorter changed since (resuming would mismatch).
  if (!enabled || !progress || progress.versionMismatch) return null;

  return (
    <Link
      href={`/sorter/${slug}/sort`}
      className="group mb-5 flex items-center justify-between gap-4 rounded-xl border border-main/40 bg-main/[0.06] px-4 py-3 transition-colors hover:border-main/70"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-main text-main-foreground">
          <Play size={16} />
        </span>
        <div className="min-w-0">
          <div className="font-bold text-foreground">
            Continue where you left off
          </div>
          <div className="font-mono text-[12px] text-muted-foreground">
            You have a sort in progress
          </div>
        </div>
      </div>
      <span className="hud shrink-0 text-xs text-main-ink group-hover:translate-x-0.5 transition-transform">
        Resume →
      </span>
    </Link>
  );
}
