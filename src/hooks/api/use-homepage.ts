"use client";

import { useQuery } from "@tanstack/react-query";

interface SorterPreview {
  id: string;
  title: string;
  slug: string;
  category?: string;
  completionCount: number;
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
    staleTime: 60000, // Keep data fresh for 1 minute
    refetchOnMount: false, // Don't refetch if we have initialData from SSR
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch when internet reconnects
    retry: 3,
  });
}

export type { SorterPreview, HomepageData };
