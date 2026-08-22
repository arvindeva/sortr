"use client";

import { useQuery } from "@tanstack/react-query";
import { SorterHeaderServer } from "@/components/sorter-header-server";
import { SorterPageClient } from "@/components/sorter-page-client";
import { SorterOwnerControls } from "@/components/sorter-owner-controls";
import { ContinueSortingBanner } from "@/components/continue-sorting-banner";
import { SorterContentSkeleton } from "@/components/skeletons/sorter-content-skeleton";
import { PageContainer } from "@/components/ui/page-container";
import type { SorterData } from "@/hooks/api/use-sorter";

/**
 * Client half of a private sorter page. The ISR-cached HTML is a bare shell;
 * this fetches /api/sorters/[slug], which 404s for everyone but the owner.
 */
export function PrivateSorterView({ slug }: { slug: string }) {
  const { data, isPending, isError } = useQuery<SorterData>({
    queryKey: ["sorter", slug],
    queryFn: async () => {
      const res = await fetch(`/api/sorters/${slug}`);
      if (!res.ok) throw new Error("private");
      return res.json();
    },
    retry: false,
  });

  if (isPending) {
    return (
      <PageContainer>
        <SorterContentSkeleton />
      </PageContainer>
    );
  }
  if (isError || !data) {
    return (
      <PageContainer>
        <div className="py-24 text-center">
          <p className="display text-2xl font-black text-foreground">
            This sorter is private
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Only its creator can view or play it.
          </p>
        </div>
      </PageContainer>
    );
  }

  const hasFilters = Boolean(data.tags && data.tags.length > 0);

  return (
    <PageContainer>
      <SorterHeaderServer sorter={data.sorter} hasFilters={hasFilters} isOwner>
        {/* Owner is the only one who can ever land here (API 404s everyone
            else), so the controls always apply. */}
        <SorterOwnerControls
          ownerUserId={data.sorter.user.id}
          sorterSlug={data.sorter.slug}
          sorterTitle={data.sorter.title}
        />
      </SorterHeaderServer>

      <ContinueSortingBanner sorterId={data.sorter.id} slug={data.sorter.slug} />

      <SorterPageClient
        slug={slug}
        isOwner
        initialData={data}
        hideCommunity
      />
    </PageContainer>
  );
}
