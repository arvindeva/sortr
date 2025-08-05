import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Play, Trophy, Pencil } from "lucide-react";
import { DeleteSorterButton } from "@/components/delete-sorter-button";

interface SorterHeaderServerProps {
  sorter: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    category?: string;
    coverImageUrl?: string;
    completionCount: number;
    user: {
      username: string;
      id: string;
    };
  };
  hasFilters: boolean;
  isOwner: boolean;
}

export function SorterHeaderServer({
  sorter,
  hasFilters,
  isOwner,
}: SorterHeaderServerProps) {
  return (
    <>
      {/* Sorter Header */}
      <section className="mb-4 md:mb-8">
        <div className="flex items-center space-x-3 py-4 md:space-x-6">
          {/* Cover Image */}
          <div className="border-border rounded-base flex h-20 w-20 items-center justify-center overflow-hidden border-2 sm:h-36 sm:w-36 md:h-48 md:w-48">
            {sorter.coverImageUrl ? (
              <img
                src={sorter.coverImageUrl}
                alt={`${sorter.title}'s cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-secondary-background text-main flex h-full w-full items-center justify-center">
                <span className="text-4xl font-bold">
                  {sorter.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Sorter Info */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <PageHeader>{sorter.title}</PageHeader>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-medium">
              <div className="flex items-center gap-1">
                <span>by</span>
                {sorter.user.username ? (
                  <Link
                    href={`/user/${sorter.user.username}`}
                    className="font-bold hover:underline"
                  >
                    {sorter.user.username}
                  </Link>
                ) : (
                  <span className="font-bold">Unknown User</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Trophy size={16} />
                <span>{sorter.completionCount}</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="mt-4 hidden items-center gap-4 md:flex">
              {hasFilters ? (
                <Button
                  asChild
                  size="default"
                  variant="default"
                  className="group"
                >
                  <Link href={`/sorter/${sorter.slug}/filters`}>
                    <Play
                      className="transition-transform duration-200 group-hover:translate-x-1"
                      size={20}
                    />
                    Sort Now
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="default"
                  variant="default"
                  className="group"
                >
                  <Link href={`/sorter/${sorter.slug}/sort`}>
                    <Play
                      className="transition-transform duration-200 group-hover:translate-x-1"
                      size={20}
                    />
                    Sort now
                  </Link>
                </Button>
              )}

              {/* Edit Button - Only show for sorter owner */}
              {isOwner && (
                <Button asChild variant="neutral">
                  <Link href={`/sorter/${sorter.slug}/edit`}>
                    <Pencil className="mr-2" size={16} />
                    Edit
                  </Link>
                </Button>
              )}

              {/* Delete Button - Only show for sorter owner */}
              {isOwner && (
                <DeleteSorterButton
                  sorterSlug={sorter.slug}
                  sorterTitle={sorter.title}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Action Buttons */}
      <div className="mb-8 flex items-center gap-4 md:hidden">
        {hasFilters ? (
          <Button asChild size="default" variant="default" className="group">
            <Link href={`/sorter/${sorter.slug}/filters`}>
              <Play
                className="transition-transform duration-200 group-hover:translate-x-1"
                size={20}
              />
              Sort Now
            </Link>
          </Button>
        ) : (
          <Button asChild size="default" variant="default" className="group">
            <Link href={`/sorter/${sorter.slug}/sort`}>
              <Play
                className="transition-transform duration-200 group-hover:translate-x-1"
                size={20}
              />
              Sort now
            </Link>
          </Button>
        )}

        {/* Edit Button - Only show for sorter owner */}
        {isOwner && (
          <Button asChild variant="neutral" size="icon">
            <Link href={`/sorter/${sorter.slug}/edit`}>
              <Pencil size={16} />
            </Link>
          </Button>
        )}

        {/* Delete Button - Only show for sorter owner */}
        {isOwner && (
          <DeleteSorterButton
            sorterSlug={sorter.slug}
            sorterTitle={sorter.title}
            iconOnly
          />
        )}
      </div>

      {/* Description and Category */}
      <div className="mb-8 space-y-4">
        {sorter.description && (
          <div>
            <p className="font-medium">{sorter.description}</p>
          </div>
        )}
        {sorter.category && (
          <div>
            <Badge variant="default">{sorter.category}</Badge>
          </div>
        )}
      </div>
    </>
  );
}
