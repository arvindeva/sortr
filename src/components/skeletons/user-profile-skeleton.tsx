import { UserProfileContentSkeleton } from "./user-profile-content-skeleton";

export function UserProfileSkeleton() {
  return (
    <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
      {/* Profile Header Skeleton - Match actual UserProfileHeaderServer */}
      <section className="mb-4 md:mb-8">
        <div className="flex items-center space-x-3 py-4 md:space-x-6">
          {/* Avatar skeleton - match actual size and styling */}
          <div className="relative">
            <div className="border-border rounded-base bg-muted h-28 w-28 border shadow-md animate-pulse md:h-48 md:w-48" />
          </div>

          {/* User info skeleton */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-32 rounded-base bg-muted animate-pulse md:h-10 md:w-40" />
            </div>
            <div className="h-4 w-40 rounded-base bg-muted animate-pulse md:w-56" />
          </div>
        </div>
      </section>

      {/* Content (Sorters + Rankings) */}
      <UserProfileContentSkeleton />
    </main>
  );
}
