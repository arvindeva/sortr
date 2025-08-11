"use client";

import { useQuery } from "@tanstack/react-query";

interface SorterPreview {
  id: string;
  title: string;
  slug: string;
  category?: string;
  completionCount: number;
  viewCount: number;
  coverImageUrl?: string;
  creatorUsername: string;
}

interface HomepageData {
  popularSorters: SorterPreview[];
  total: number;
  timestamp: string;
}

async function fetchPopularSorters(): Promise<HomepageData> {
  const response = await fetch("/api/sorters");

  if (!response.ok) {
    throw new Error(`Failed to fetch popular sorters: ${response.status}`);
  }

  return response.json();
}

export function usePopularSorters(initialData?: HomepageData) {
  return useQuery({
    queryKey: ["homepage", "popular-sorters"],
    queryFn: fetchPopularSorters,
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  });
}

export type { SorterPreview, HomepageData };
