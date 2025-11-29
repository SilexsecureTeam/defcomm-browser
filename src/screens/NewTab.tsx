import { useState } from "react";
import { PiToggleLeftFill } from "react-icons/pi";
import { useTabStore } from "../stores/tabStore";

export default function NewTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const { activeTab, updateTabUrl, updateTab } = useTabStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    let newUrl = searchQuery.trim();
    if (!newUrl) return;

    try {
      if (activeTab == null) {
        console.warn("[NewTab] No active tab selected, aborting navigation.");
        return;
      }

      updateTab(activeTab, { isLoading: true });

      // Detect URL vs Search
      if (!/^https?:\/\//i.test(newUrl)) {
        if (newUrl.includes(" ") || !newUrl.includes(".")) {
          newUrl = `https://www.google.com/search?q=${encodeURIComponent(
            newUrl
          )}`;
        } else {
          newUrl = `https://${newUrl}`;
        }
      }

      // Update the active tab URL (SearchComponent + WebViewManager will handle load)
      updateTabUrl(activeTab, newUrl);
      console.log("[NewTab] Navigating to:", newUrl);
    } catch (error) {
      console.error("[NewTab] Search error:", error);
      if (activeTab != null) updateTab(activeTab, { isLoading: false });
    }
  };

  return (
    <div className="h-full bg-white dark:bg-[black] text-black dark:text-primaryTabText-dark">
      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="flex items-center gap-3 my-10">
          {/* Light mode logo */}
          <img
            src="/defcomm.png"
            alt="Browser"
            className="w-12 h-12 dark:hidden"
          />

          {/* Dark mode logo */}
          <img
            src="/defcomm-white.png"
            alt="Browser"
            className="w-12 h-12 hidden dark:block"
          />
          <h1 className="text-4xl font-semibold">Explore. Securely</h1>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-2xl mb-16">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative h-14">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <img
                  src="/defcomm.png"
                  alt="Icon"
                  className="w-7 dark:hidden"
                />
                <img
                  src="/defcomm-white.png"
                  alt="Icon"
                  className="w-7 dark:block"
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Defcomm or type a URL"
                className="text-sm w-full h-full pl-14 pr-12 py-4 lg:text-lg bg-white dark:bg-[black] border border-primaryBorder dark:border-primaryBorder-dark rounded-2xl shadow-sm hover:shadow-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
                autoFocus
              />
              <div className="text-xs md:text-sm absolute inset-y-0 right-0 pr-4 flex items-center text-gray-700 dark:text-white font-semibold gap-3">
                <PiToggleLeftFill size={24} />
                <span>Secure Mode</span>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
