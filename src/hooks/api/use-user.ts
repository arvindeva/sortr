"use client";

import { useQuery } from "@tanstack/react-query";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  image?: string;
  emailVerified: string | null;
}

interface UserStats {
  sorterCount: number;
  rankingCount: number;
}

interface SorterPreview {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  createdAt: string;
  completionCount: number;
  viewCount: number;
  coverImageUrl?: string;
  creatorUsername: string;
}

interface RankingPreview {
  id: string;
  sorterId: string;
  rankings: string; // JSON string
  top3: Array<{
    id: string;
    title: string;
    imageUrl?: string;
  }>;
  createdAt: string;
  sorterTitle: string;
  sorterSlug?: string;
  sorterCategory?: string;
}

interface UserProfileData {
  user: UserProfile;
  stats: UserStats;
  sorters: SorterPreview[];
  rankings: RankingPreview[];
  userSince: string;
  timestamp: string;
}

async function fetchUserProfile(username: string): Promise<UserProfileData> {
  const response = await fetch(`/api/user/${encodeURIComponent(username)}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("User not found");
    }
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }
  
  return response.json();
}

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ["user", username],
    queryFn: () => fetchUserProfile(username),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error.message === "User not found") {
        return false;
      }
      return failureCount < 3;
    },
    enabled: !!username && username !== "Anonymous" && username !== "Unknown User",
  });
}

export type { 
  UserProfile, 
  UserStats, 
  SorterPreview, 
  RankingPreview, 
  UserProfileData 
};