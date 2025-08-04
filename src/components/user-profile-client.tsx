"use client";

import { useUserProfile } from "@/hooks/api";
import { UserProfileSkeleton } from "@/components/skeletons";
import { UserProfileHeader } from "@/components/user-profile-header";
import { SorterCard } from "@/components/ui/sorter-card";
import { SorterGrid } from "@/components/ui/sorter-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
import Link from "next/link";
import { getImageUrl } from "@/lib/image-utils";

interface UserProfileClientProps {
  username: string;
  isOwnProfile: boolean;
  currentUserEmail?: string;
}

export function UserProfileClient({ 
  username, 
  isOwnProfile,
  currentUserEmail 
}: UserProfileClientProps) {
  const { data, isLoading, error } = useUserProfile(username);

  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
        <section className="mb-8">
          <Box variant="warning" size="md">
            <p className="font-medium">
              {error.message === "User not found" 
                ? "User not found. This profile may not exist."
                : "Failed to load user profile. Please try again."
              }
            </p>
          </Box>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
        <section className="mb-8">
          <Box variant="warning" size="md">
            <p className="font-medium">User not found.</p>
          </Box>
        </section>
      </main>
    );
  }

  const { user, stats, sorters, rankings, userSince } = data;

  return (
    <main className="container mx-auto max-w-6xl px-2 py-2 md:px-4 md:py-8">
      {/* Profile Header */}
      <UserProfileHeader
        username={user.username || ""}
        userSince={userSince}
        isOwnProfile={isOwnProfile}
        currentImage={user.image}
      />

      {/* Sorters Section */}
      <section className="mb-8">
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Sorters ({sorters.length})</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {sorters.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="md">
                  <p className="mb-4 font-medium">No sorters created yet.</p>
                  <p className="font-medium">
                    Start creating sorters to share with others!
                  </p>
                </Box>
              </div>
            ) : (
              <SorterGrid>
                {sorters.map((sorter) => (
                  <SorterCard key={sorter.id} sorter={sorter} />
                ))}
              </SorterGrid>
            )}
          </PanelContent>
        </Panel>
      </section>

      {/* Rankings Section */}
      <section>
        <Panel variant="primary">
          <PanelHeader variant="primary">
            <PanelTitle>Rankings ({rankings.length})</PanelTitle>
          </PanelHeader>
          <PanelContent variant="primary" className="p-2 md:p-6">
            {rankings.length === 0 ? (
              <div className="text-center">
                <Box variant="warning" size="md">
                  <p className="mb-4 font-medium">No rankings yet.</p>
                  <p className="font-medium">
                    Complete some sorting sessions to see rankings!
                  </p>
                </Box>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {rankings.map((result) => (
                  <Link
                    key={result.id}
                    href={`/rankings/${result.id}`}
                    className="card-link"
                  >
                    <Card className="card cursor-pointer gap-2 md:min-h-[180px]">
                      <CardHeader className="flex flex-col justify-start">
                        <CardTitle className="line-clamp-2 leading-relaxed">
                          {result.sorterTitle}
                        </CardTitle>
                        {result.sorterCategory && (
                          <Badge variant="default">
                            {result.sorterCategory}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Top 3 Rankings Preview */}
                        <div className="mb-3 space-y-2">
                          {result.top3.map((item: any, index: number) => (
                            <div
                              key={item.id || index}
                              className="flex items-center gap-2"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                {item.imageUrl ? (
                                  <div className="border-border rounded-base h-6 w-6 flex-shrink-0 overflow-hidden border-2">
                                    <img
                                      src={getImageUrl(item.imageUrl, "thumbnail")}
                                      alt={item.title}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        // Fallback to full-size image if thumbnail fails to load
                                        const target = e.target as HTMLImageElement;
                                        if (target.src.includes('-thumb')) {
                                          target.src = getImageUrl(item.imageUrl, "full");
                                        }
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="border-border bg-secondary-background rounded-base flex h-6 w-6 flex-shrink-0 items-center justify-center border-2">
                                    <span className="text-main text-xs font-bold">
                                      {item.title.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="min-w-[1.5rem] text-center font-bold">
                                  {index + 1}.
                                </span>
                                <span className="font-medium break-words">
                                  {item.title}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Date */}
                        <div className="text-foreground text-xs font-medium">
                          {new Date(result.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </PanelContent>
        </Panel>
      </section>
    </main>
  );
}