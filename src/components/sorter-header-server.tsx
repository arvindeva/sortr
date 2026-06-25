import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CoverTile } from "@/components/ui/cover-tile";
import { Play } from "lucide-react";

interface SorterHeaderServerProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    category?: string;
    coverImageUrl?: string;
    completionCount: number;
    itemCount?: number;
    rankingCount?: number;
    user: {
      username: string;
      id: string;
    };
  };
  hasFilters: boolean;
  isOwner: boolean;
  children?: React.ReactNode;
}

export function SorterHeaderServer({
  sorter,
  hasFilters,
  children,
}: SorterHeaderServerProps) {
  const sortHref = hasFilters
    ? `/sorter/${sorter.slug}/filters`
    : `/sorter/${sorter.slug}/sort`;

  // mono meta line: by @user · N plays · N rankings
  const meta: React.ReactNode[] = [];
  meta.push(
    <span key="by">
      by{" "}
      {sorter.user.username ? (
        <Link
          href={`/user/${sorter.user.username}`}
          className="text-cyan-ink hover:underline"
        >
          @{sorter.user.username}
        </Link>
      ) : (
        <span className="text-foreground">Unknown</span>
      )}
    </span>,
  );
  meta.push(
    <span key="plays">{sorter.completionCount.toLocaleString()} plays</span>,
  );
  if (sorter.rankingCount != null) {
    meta.push(
      <span key="rankings">{sorter.rankingCount.toLocaleString()} rankings</span>,
    );
  }

  return (
    <section className="mb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
        {/* Cover */}
        <CoverTile
          imageUrl={sorter.coverImageUrl}
          name={sorter.title}
          colorKey={sorter.slug}
          nameSize={26}
          radius={14}
          className="h-28 w-28 shrink-0 sm:h-[170px] sm:w-[170px]"
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="hud mb-2 text-xs text-cyan-ink">
            {[sorter.category, sorter.itemCount != null && `${sorter.itemCount} items`]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <h1 className="display text-[clamp(2.25rem,6vw,3.875rem)] font-black text-foreground">
            {sorter.title}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[13px] text-muted-foreground">
            {meta.map((m, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/50">·</span>}
                {m}
              </span>
            ))}
          </div>

          {sorter.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              {sorter.description}
            </p>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" arcade className="group">
              <Link href={sortHref}>
                <Play
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  size={20}
                />
                Sort now
              </Link>
            </Button>
            {/* Client-injected owner controls slot */}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
