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
  version?: number;
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
async function fetchSorterData(
  slug: string,
  version?: number | string,
): Promise<SorterData> {
  const response = await fetch(
    version ? `/api/sorters/${slug}?v=${version}` : `/api/sorters/${slug}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Sorter not found");
    }
    throw new Error("Failed to fetch sorter data");
  }

  const data = await response.json();
  return data;
}

async function fetchRecentResults(
  slug: string,
  version?: number | string,
): Promise<RecentResult[]> {
  const response = await fetch(
    version
      ? `/api/sorters/${slug}/results?v=${version}`
      : `/api/sorters/${slug}/results`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    // Results endpoint might not exist yet, return empty array
    return [];
  }

  const data = await response.json();
  return data;
}

// TanStack Query hooks
export function useSorterData(
  slug: string,
  enabled: boolean = true,
  initialData?: SorterData,
  initialDataUpdatedAt?: number,
  version?: number,
) {
  return useQuery({
    queryKey: ["sorter", slug, version ?? "noversion"],
    queryFn: () => fetchSorterData(slug, version),
    initialData,
    staleTime: 0, // Always treat as stale
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

export function useRecentResults(
  slug: string,
  enabled: boolean = true,
  version?: number,
) {
  return useQuery({
    queryKey: ["sorter", slug, "recent-results", version ?? "noversion"],
    queryFn: () => fetchRecentResults(slug, version),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2, // Recent results are optional, less aggressive retry
    enabled,
  });
}

// Combined hook for sorter page data
export function useSorterPage(
  slug: string,
  initialData?: SorterData & { version?: number },
  initialDataUpdatedAt?: number,
) {
  const version = initialData?.sorter?.version;
  const sorterQuery = useSorterData(
    slug,
    true,
    initialData,
    initialDataUpdatedAt,
    version,
  );
  const recentResultsQuery = useRecentResults(
    slug,
    !!sorterQuery.data?.sorter,
    version,
  );

  return {
    sorterData: sorterQuery.data,
    recentResults: recentResultsQuery.data || [],
    isLoading: sorterQuery.isLoading || recentResultsQuery.isLoading,
    isError: sorterQuery.isError,
    error: sorterQuery.error,
    refetch: () => {
      sorterQuery.refetch();
      recentResultsQuery.refetch();
    },
  };
}
