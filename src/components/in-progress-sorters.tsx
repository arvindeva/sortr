"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CoverTile } from "@/components/ui/cover-tile";
import { SorterGrid } from "@/components/ui/sorter-grid";

interface InProgressItem {
  sorterId: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  category?: string;
  completionCount: number;
  itemCount: number;
  updatedAt: string;
  versionMismatch: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * The signed-in user's in-progress sorts, shown on their own profile. Fetched
 * client-side (private to the user). Each card resumes the sort. Renders
 * nothing if there are none.
 */
export function InProgressSorters() {
  const { data } = useQuery<{ inProgress: InProgressItem[] }>({
    queryKey: ["in-progress-sorts"],
    queryFn: async () => {
      const res = await fetch("/api/sort-progress");
      if (!res.ok) return { inProgress: [] };
      return res.json();
    },
    staleTime: 30_000,
  });

  const items = data?.inProgress ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="display mb-4 text-3xl font-black text-foreground">
        In progress
        <span className="font-bold text-muted-foreground"> ({items.length})</span>
      </h2>
      <SorterGrid>
        {items.map((it) => (
          <Link
            key={it.sorterId}
            href={`/sorter/${it.slug}/sort`}
            className="group block h-full w-full"
          >
            <div className="flex h-full flex-col">
              <div className="relative">
                <CoverTile
                  imageUrl={it.coverImageUrl}
                  name={it.title}
                  colorKey={it.sorterId}
                  className="aspect-square w-full rounded-xl"
                />
                {/* "Continue" overlay badge */}
                <div className="absolute top-2 left-2 rounded-md bg-main px-2 py-1 font-mono text-[11px] font-bold text-main-foreground">
                  ▶ Continue
                </div>
              </div>
              <div className="mt-2.5 flex min-h-[40px] flex-col">
                <span className="line-clamp-2 font-bold text-foreground group-hover:text-main-ink">
                  {it.title}
                </span>
                <span className="mt-auto pt-1 font-mono text-[12px] text-muted-foreground">
                  {it.itemCount} items · {timeAgo(it.updatedAt)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </SorterGrid>
    </section>
  );
}
