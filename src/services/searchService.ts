// src/services/searchService.ts
export interface SearchResult {
  title: string;
  link: string;
  displayLink: string;
  snippet: string;
  formattedUrl: string;
}

export class SearchService {
  async search(query: string): Promise<SearchResult[]> {
    // For now, return mock data that looks real
    // Later you can integrate with Google Custom Search API
    return this.getMockResults(query);
  }

  private getMockResults(query: string): SearchResult[] {
    const baseDomain = query.toLowerCase().replace(/\s+/g, "");

    return [
      {
        title: `${query} - Official Website`,
        link: `https://www.${baseDomain}.com`,
        displayLink: `${baseDomain}.com`,
        snippet: `Official website for ${query}. Find information, services, products, and more about ${query}. Visit now for the latest updates and offerings.`,
        formattedUrl: `https://www.${baseDomain}.com`,
      },
      {
        title: `${query} - Wikipedia`,
        link: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, "_")}`,
        displayLink: "en.wikipedia.org",
        snippet: `Learn about ${query} on Wikipedia. Comprehensive information including history, features, services, and more. Free encyclopedia with detailed articles.`,
        formattedUrl: `https://en.wikipedia.org/wiki/${query.replace(
          /\s+/g,
          "_"
        )}`,
      },
      {
        title: `About ${query} - Everything You Need to Know`,
        link: `https://www.${baseDomain}info.com`,
        displayLink: `${baseDomain}info.com`,
        snippet: `Complete guide to ${query}. Features, pricing, reviews, alternatives, and user experiences. Everything you need to make an informed decision.`,
        formattedUrl: `https://www.${baseDomain}info.com`,
      },
    ];
  }

  getRelatedSearches(query: string): string[] {
    return [
      `${query} near me`,
      `${query} prices`,
      `${query} menu`,
      `best ${query}`,
      `${query} reviews`,
      `${query} locations`,
      `${query} delivery`,
      `${query} official site`,
    ];
  }
}

export const searchService = new SearchService();
