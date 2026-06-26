import { getBrowseSorters } from "@/lib/browse";
import { BrowseClient } from "./browse-client";

// SSR + 60s ISR: server-render the initial results so crawlers (and the first
// paint) see real sorter listings, while client-side filtering stays live.
// (Metadata lives in browse/layout.tsx.)
export const revalidate = 60;

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    categories?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const sp = await searchParams;

  // Run the same query the client will, so the SSR HTML matches the first
  // client render (seeded as react-query initialData → no refetch flash).
  const initialData = await getBrowseSorters({
    query: sp.q || "",
    categories: sp.categories
      ? sp.categories.split(",").filter(Boolean)
      : [],
    sort: sp.sort || "popular",
    page: parseInt(sp.page || "1"),
    limit: 20,
  });

  return <BrowseClient initialData={initialData} />;
}
