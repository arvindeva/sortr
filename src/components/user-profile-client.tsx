"use client";

import { useState } from "react";
import { useUserProfile } from "@/hooks/api";
import { UserProfileContentSkeleton } from "@/components/skeletons/user-profile-content-skeleton";
import { SorterCard } from "@/components/ui/sorter-card";
import { RankingPodium } from "@/components/ui/ranking-podium";
import { TeamHeading } from "@/components/ui/team-heading";
import { teamColorStyle, type TeamColor } from "@/lib/team-colors";
import { InProgressSorters } from "@/components/in-progress-sorters";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfileClientProps {
  username: string;
  isOwnProfile: boolean;
  isOwner?: boolean;
  currentUserEmail?: string;
  initialData?: any; // Will use the same type as useUserProfile returns
}

// Team-color section heading with an optional count — the tilted block used
// on the homepage and sorter pages.
function SectionTitle({
  children,
  count,
  color,
}: {
  children: React.ReactNode;
  count?: number;
  color: TeamColor;
}) {
  return (
    <div style={teamColorStyle(color)}>
      <TeamHeading size="lg">
        {children}
        {count != null && <span className="opacity-60"> ({count})</span>}
      </TeamHeading>
    </div>
  );
}

export function UserProfileClient({
  username,
  isOwnProfile,
  isOwner,
  currentUserEmail,
  initialData,
}: UserProfileClientProps) {
  const { data, isLoading, error } = useUserProfile(username, initialData);
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  if (isLoading) {
    return <UserProfileContentSkeleton />;
  }

  if (error) {
    return (
      <section className="mb-8">
        <EmptyState
          variant="error"
          title={
            error.message === "User not found"
              ? "User not found. This profile may not exist."
              : "Failed to load user profile. Please try again."
          }
        />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="mb-8">
        <EmptyState variant="error" title="User not found." />
      </section>
    );
  }

  const { user, stats, sorters, rankings, userSince } = data;

  // Prefer the API's isOwner (refreshes with the session) over the SSR prop,
  // which can go stale if the session changes in another tab.
  const ownerNow = data?.isOwner ?? isOwner;
  const hasNonPublic =
    ownerNow &&
    sorters.some((s: any) => s.visibility && s.visibility !== "public");
  const visibleSorters =
    visibilityFilter === "all"
      ? sorters
      : sorters.filter(
          (s: any) => (s.visibility ?? "public") === visibilityFilter,
        );

  return (
    <>
      {/* In-progress sorts — private, own profile only */}
      {isOwnProfile && <InProgressSorters />}

      {/* Sorters Section */}
      <section className="mb-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <SectionTitle color="magenta" count={sorters.length}>
            Sorters
          </SectionTitle>
          {hasNonPublic && (
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          {sorters.length === 0 ? (
            <EmptyState
              title="No sorters created yet."
              description="Start creating sorters to share with others!"
            />
          ) : (
            <SorterGrid>
              {visibleSorters.map((sorter: any) => (
                <SorterCard key={sorter.id} sorter={sorter} />
              ))}
            </SorterGrid>
          )}
        </div>
      </section>

      {/* Rankings Section */}
      <section>
        <div className="mb-6 md:mb-9">
          <SectionTitle color="cyan" count={rankings.length}>
            Rankings
          </SectionTitle>
        </div>
        <div>
          {rankings.length === 0 ? (
            <EmptyState
              title="No rankings yet."
              description="Complete some sorting sessions to see rankings!"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rankings.map((result) => (
                <Link
                  key={result.id}
                  href={`/rankings/${result.id}`}
                  prefetch={false}
                  className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-main/40 md:p-5"
                >
                  {/* Title + date (top-right, matching the sorter recent cards) */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="display normal-case text-[22px] leading-tight font-extrabold text-foreground">
                      {result.sorterTitle}
                    </h3>
                    <span className="hud mt-1 shrink-0 text-[11px] font-bold text-muted-foreground">
                      {new Date(result.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Top 3 preview */}
                  <RankingPodium items={result.top3} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
