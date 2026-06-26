import { NextRequest, NextResponse } from "next/server";
import { getBrowseSorters } from "@/lib/browse";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const categoriesParam = searchParams.get("categories") || "";
    const result = await getBrowseSorters({
      query: searchParams.get("q") || "",
      categories: categoriesParam
        ? categoriesParam.split(",").filter(Boolean)
        : [],
      sort: searchParams.get("sort") || "popular",
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in browse API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
