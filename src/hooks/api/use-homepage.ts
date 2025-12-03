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
    placeholderData: initialData, // Use placeholderData instead of initialData for SSR
    staleTime: 60000, // Keep data fresh for 1 minute
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3,
  });
}

export type { SorterPreview, HomepageData };
