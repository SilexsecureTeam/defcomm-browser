// src/components/browser/CustomWebView.tsx
import { useState, useEffect } from "react";
import SearchResult from "./SearchResult";
import { searchService } from "../../services/searchService";

interface CustomWebViewProps {
  id: number;
  url: string;
  // isActive: boolean;
}

// Function to extract search query from URL
const getSearchQuery = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.searchParams.get("q") ||
      urlObj.searchParams.get("query") ||
      urlObj.searchParams.get("search") ||
      "Search"
    );
  } catch {
    return "Search";
  }
};

export default function CustomWebView({ id, url }: CustomWebViewProps) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchData, setSearchData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real search data when URL changes
  useEffect(() => {
    const fetchSearchData = async () => {
      if (!url || url === "newtab") return;

      const query = getSearchQuery(url);
      setSearchQuery(query);
      setCurrentUrl(url);

      // Fetch real search results
      setIsLoading(true);
      try {
        const results = await searchService.search(query);
        const relatedSearches = searchService.getRelatedSearches(query);

        setSearchData({
          results,
          relatedSearches,
          stats: `About ${Math.floor(
            Math.random() * 100000000
          ).toLocaleString()} results (0.${Math.floor(
            Math.random() * 99
          )} seconds)`,
        });
      } catch (error) {
        console.error("Failed to fetch search results:", error);
        // Fallback to mock data
        setSearchData({
          results: [],
          relatedSearches: searchService.getRelatedSearches(query),
          stats: "About 0 results (0.00 seconds)",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchData();
  }, [url, id]);

  return (
    <div className="w-full h-full">
      <SearchResult
        query={searchQuery}
        {...({ searchData, isLoading, originalUrl: currentUrl } as any)}
      />
    </div>
  );
}
