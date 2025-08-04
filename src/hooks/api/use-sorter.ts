import { useQuery } from "@tanstack/react-query";

// Types
interface SorterItem {
  id: string;
  title: string;
  imageUrl?: string;
  groupImageUrl?: string;
}

interface Sorter {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  coverImageUrl?: string;
  userId: string;
  createdAt: string;
  completionCount: number;
  viewCount: number;
  user: {
    username: string;
    id: string;
  };
}

interface SorterTag {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  items: SorterItem[];
}

export interface SorterData {
  sorter: Sorter;
  items: SorterItem[];
  tags?: SorterTag[];
}

interface RecentResult {
  id: string;
  username: string;
  top3: any[];
  createdAt: string;
}

export interface SorterPageData {
  sorterData: SorterData;
  recentResults: RecentResult[];
}

// API functions
async function fetchSorterData(slug: string): Promise<SorterData> {
  console.log(`🔍 Fetching sorter data for slug: ${slug}`);
  
  const response = await fetch(`/api/sorters/${slug}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Sorter not found");
    }
    throw new Error("Failed to fetch sorter data");
  }
  
  const data = await response.json();
  console.log(`✅ Fetched sorter data for: ${data.sorter.title}`);
  return data;
}

async function fetchRecentResults(slug: string): Promise<RecentResult[]> {
  console.log(`🔍 Fetching recent results for sorter: ${slug}`);
  
  const response = await fetch(`/api/sorters/${slug}/results`);
  
  if (!response.ok) {
    // Results endpoint might not exist yet, return empty array
    console.warn(`⚠️ Failed to fetch recent results for sorter ${slug}`);
    return [];
  }
  
  const data = await response.json();
  console.log(`✅ Fetched ${data.length} recent results`);
  return data;
}

// TanStack Query hooks
export function useSorterData(slug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["sorter", slug],
    queryFn: () => fetchSorterData(slug),
    staleTime: 30 * 1000, // 30 seconds - shorter since view counts change
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 404 (sorter not found)
      if (error.message === "Sorter not found") {
        return false;
      }
      return failureCount < 3;
    },
    enabled,
  });
}

export function useRecentResults(slug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["sorter", slug, "recent-results"],
    queryFn: () => fetchRecentResults(slug),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2, // Recent results are optional, less aggressive retry
    enabled,
  });
}

// Combined hook for sorter page data
export function useSorterPage(slug: string) {
  const sorterQuery = useSorterData(slug);
  const recentResultsQuery = useRecentResults(
    slug,
    !!sorterQuery.data?.sorter
  );

  return {
    sorterData: sorterQuery.data,
    recentResults: recentResultsQuery.data || [],
    isLoading: sorterQuery.isLoading,
    isError: sorterQuery.isError,
    error: sorterQuery.error,
    refetch: () => {
      sorterQuery.refetch();
      recentResultsQuery.refetch();
    },
  };
}