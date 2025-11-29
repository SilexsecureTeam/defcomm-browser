// components/SearchComponent.tsx
import { useState, useMemo, useEffect, useRef } from "react";
import { FiShield, FiCheck, FiMenu, FiSearch } from "react-icons/fi";
import { IoIosRefresh } from "react-icons/io";
import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { MdOutlineInput } from "react-icons/md";
import { RiStore2Line } from "react-icons/ri";
import { useTabStore } from "../../stores/tabStore";
import { webViewManager } from "../../services/WebViewManager";
import BrowserMenu from "./BrowserMenu";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export default function SearchComponent() {
  const {
    tabs,
    activeTab,
    goBack,
    goForward,
    reload,
    updateTabUrl,
    updateTab,
  } = useTabStore();

  const currentTab = useMemo(
    () => tabs.find((t) => t.id === activeTab),
    [tabs, activeTab]
  );

  const [inputValue, setInputValue] = useState(currentTab?.url || "");
  const [isSecure, setIsSecure] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<any>(null);

  // Enhanced URL detection
  const isSearchUrl = (url: string): boolean => {
    if (!url || url === "newtab") return false;

    const searchPatterns = [
      /^https?:\/\/[^/]+\/search\?/i,
      /^https?:\/\/[^/]+\/search\/.*\?/i,
      /^https?:\/\/(www\.)?google\.[^/]+\/search/i,
      /^https?:\/\/(www\.)?bing\.[^/]+\/search/i,
      /^https?:\/\/(www\.)?duckduckgo\.[^/]+\/\?q=/i,
      /^https?:\/\/(www\.)?yahoo\.[^/]+\/search/i,
      /^https?:\/\/search\./i,
      /[?&]q=/i,
      /[?&]query=/i,
      /[?&]search=/i,
    ];

    return searchPatterns.some((pattern) => pattern.test(url));
  };

  const isInternalUrl = (url: string): boolean => {
    return url === "newtab";
  };

  const getDomainFromUrl = (url: string): string | null => {
    try {
      if (isInternalUrl(url)) return null;
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  };

  const updateSecurityIndicators = (url: string) => {
    if (isInternalUrl(url)) {
      setIsSecure(true);
      setIsVerified(true);
      return;
    }

    const isHttps = url.startsWith("https://");
    const isSearch = isSearchUrl(url);
    const domain = getDomainFromUrl(url);

    setIsSecure(isHttps && !isSearch);

    const verifiedDomains = [
      "google.com",
      "github.com",
      "stackoverflow.com",
      "microsoft.com",
      "apple.com",
      "tauri.app",
      "defcomm.ng",
    ];
    setIsVerified(
      Boolean(
        isHttps && domain && verifiedDomains.some((d) => domain.includes(d))
      )
    );
  };

  // Listen for URL changes from webview
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupUrlListener = async () => {
      try {
        unlisten = await listen("webview-url-changed", (event: any) => {
          const { label, url } = event.payload;
          const tabId = parseInt(label.replace("tab-webview-", ""));

          if (tabId === activeTab) {
            console.log(`[Search] URL changed to: ${url}`);
            setInputValue(url);
            updateSecurityIndicators(url);
            updateTab(tabId, { url });
          }
        });
      } catch (error) {
        console.error("Failed to setup URL listener:", error);
      }
    };

    setupUrlListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [activeTab, updateTab]);

  // Update input when tab changes
  useEffect(() => {
    if (currentTab && currentTab.url !== inputValue) {
      setInputValue(currentTab.url);
      updateSecurityIndicators(currentTab.url);
      setIsLoading(currentTab.isLoading || false);
    }
  }, [currentTab?.url, currentTab?.isLoading]);

  // Listen for webview events
  useEffect(() => {
    const setupListeners = async () => {
      const unlistenLoading = await listen("webview-loading", (event: any) => {
        const { label, isLoading } = event.payload;
        const tabId = parseInt(label.replace("tab-webview-", ""));
        if (tabId === activeTab) {
          setIsLoading(isLoading);
          updateTab(tabId, { isLoading });
        }
      });

      const unlistenNavigation = await listen(
        "webview-navigation",
        (event: any) => {
          const { label, url, title, canGoBack, canGoForward } = event.payload;
          const tabId = parseInt(label.replace("tab-webview-", ""));

          if (tabId === activeTab) {
            setInputValue(url);
            updateSecurityIndicators(url);
            updateTab(tabId, {
              url,
              title: title || "New Tab",
              canGoBack,
              canGoForward,
              isLoading: false,
            });
          }
        }
      );

      return () => {
        unlistenLoading();
        unlistenNavigation();
      };
    };

    setupListeners();
  }, [activeTab, updateTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    let newUrl = inputValue.trim();

    if (!newUrl) return;

    try {
      setIsLoading(true);
      updateTab(Number(activeTab), { isLoading: true });

      if (newUrl === "newtab") {
        if (activeTab !== null) {
          updateTabUrl(activeTab, "newtab");
        }
        setIsLoading(false);
        return;
      }

      // Process URL
      if (!/^https?:\/\//i.test(newUrl)) {
        if (newUrl.includes(" ") || !newUrl.includes(".")) {
          newUrl = `https://www.google.com/search?q=${encodeURIComponent(
            newUrl
          )}`;
        } else {
          newUrl = `https://${newUrl}`;
        }
      }

      // Simply update the tab URL - the WebViewInstance will handle the rest
      if (activeTab !== null) {
        updateTabUrl(activeTab, newUrl);
        console.log(`[Search] URL updated to: ${newUrl}`);
      }
    } catch (error) {
      console.error("Search error:", error);
      setIsLoading(false);
      updateTab(Number(activeTab), { isLoading: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+L or Cmd+L to focus address bar and select all
    if ((e.ctrlKey || e.metaKey) && e.key === "l") {
      e.preventDefault();
      inputRef.current?.select();
    }

    // Escape to blur
    if (e.key === "Escape") {
      const input = e.target as HTMLInputElement;
      input.blur();
      if (currentTab) {
        setInputValue(currentTab.url);
      }
    }

    // Ctrl+R or Cmd+R to reload
    if ((e.ctrlKey || e.metaKey) && e.key === "r") {
      e.preventDefault();
      handleNavigation("reload");
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    e.target.dataset.focused = "true";
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.dataset.focused === "true") {
      setTimeout(() => {
        delete input.dataset.focused;
      }, 0);
      return;
    }
  };

  const handleNavigation = async (action: "back" | "forward" | "reload") => {
    const webviewLabel = `tab-webview-${activeTab}`;

    if (webViewManager.hasView(webviewLabel)) {
      try {
        setIsLoading(true);
        updateTab(Number(activeTab), { isLoading: true });

        switch (action) {
          case "back":
            await invoke("eval_in_webview", {
              label: webviewLabel,
              script: "window.history.back();",
            });
            break;
          case "forward":
            await invoke("eval_in_webview", {
              label: webviewLabel,
              script: "window.history.forward();",
            });
            break;
          case "reload":
            await invoke("eval_in_webview", {
              label: webviewLabel,
              script: "window.location.reload();",
            });
            break;
        }
      } catch (error) {
        console.error(`Navigation error (${action}):`, error);
        setIsLoading(false);
        updateTab(Number(activeTab), { isLoading: false });
      }
    } else {
      switch (action) {
        case "back":
          if (activeTab !== null) goBack(activeTab);
          break;
        case "forward":
          if (activeTab !== null) goForward(activeTab);
          break;
        case "reload":
          if (activeTab !== null) reload(activeTab);
          break;
      }
    }
  };

  const navState = webViewManager?.getNavigationState(
    `tab-webview-${activeTab}`
  );
  const canGoBack = navState?.canGoBack || false;
  const canGoForward = navState?.canGoForward || false;

  const handleMenuButtonClick = () => {
    if (isMenuOpen) {
      // Close the menu
      if (menuRef.current) {
        menuRef.current.closeMenu();
      }
      setIsMenuOpen(false);
    } else {
      // Open the menu
      if (menuRef.current) {
        menuRef.current.openMenu();
      }
      setIsMenuOpen(true);
    }
  };

  return (
    <header className="w-full mt-12 px-3 bg-primary dark:bg-primary-dark backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 py-2">
      {/* Top Section */}
      <div className="flex items-center justify-between">
        {/* Navigation Controls */}
        <div className="flex items-center gap-3 text-gray-700 dark:invert dark:brightness-50">
          <button
            onClick={() => handleNavigation("back")}
            disabled={!canGoBack}
            className={`p-1 rounded-md transition ${
              canGoBack
                ? "cursor-pointer hover:bg-gray-100 hover:text-black"
                : "cursor-not-allowed opacity-40"
            }`}
          >
            <IoArrowBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleNavigation("forward")}
            disabled={!canGoForward}
            className={`p-1 rounded-md transition ${
              canGoForward
                ? "cursor-pointer hover:bg-gray-100 hover:text-black"
                : "cursor-not-allowed opacity-40"
            }`}
          >
            <IoArrowForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleNavigation("reload")}
            className="p-1 rounded-md cursor-pointer hover:bg-gray-100 hover:text-black transition"
          >
            <IoIosRefresh
              className={`w-5 h-5 transition ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {/* Search / Address Bar */}
        <form
          onSubmit={handleSearch}
          className="relative flex-1 mx-4 rounded-md overflow-hidden bg-search dark:bg-search-dark focus-within:ring-2 focus-within:ring-primaryBorder dark:focus-within:ring-primaryBorder-dark focus-within:border-primaryBorder/90 dark:focus-within:border-primaryBorder-dark/90 transition-all"
        >
          <div className="flex items-center">
            {/* Security Icon in Address Bar */}
            {isSecure && (
              <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 w-4 h-4" />
            )}

            <FiSearch
              className={`w-4 h-4 text-gray-500 ${
                isSecure ? "absolute left-8" : "absolute left-3"
              } top-1/2 -translate-y-1/2`}
            />

            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              type="text"
              className={`w-full py-2 text-sm text-primaryText dark:text-primaryText-dark placeholder:text-gray-500 focus:outline-none bg-transparent ${
                isSecure ? "pl-14 pr-3" : "pl-10 pr-3"
              }`}
              placeholder="Search or enter address"
              spellCheck="false"
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>
        </form>

        {/* Right-side icons */}
        <div className="flex items-center gap-x-1 relative text-gray-700 dark:invert dark:brightness-50">
          <button
            aria-label={isSecure ? "Secure connection" : "Not secure"}
            className="p-1 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-green-300 transition"
            title={isSecure ? "Secure connection" : "Not secure"}
          >
            {isSecure ? (
              <FiShield className="w-5 h-5 text-green-500" />
            ) : (
              <FiShield className="w-5 h-5 text-gray-500" />
            )}
          </button>

          <button
            aria-label={isVerified ? "Verified site" : "Site not verified"}
            className="p-1 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-green-300 transition"
            title={isVerified ? "Verified site" : "Site not verified"}
          >
            {isVerified ? (
              <FiCheck className="w-5 h-5 text-green-700" />
            ) : (
              <FiCheck className="w-5 h-5 text-gray-400" />
            )}
          </button>

          <button
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="p-1 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-green-300 transition"
            onClick={handleMenuButtonClick}
          >
            <FiMenu className="w-5 h-5" />
          </button>

          {/* Browser Menu */}
          <BrowserMenu
            ref={menuRef}
            webviewLabel={`tab-webview-${activeTab}`}
            onClose={() => {
              setIsMenuOpen(false);
            }}
          />
        </div>
      </div>

      {/* Bottom Info Bar — only show for newtab */}
      {currentTab?.url === "newtab" && (
        <div className="flex items-center justify-between text-xs font-medium py-2">
          <div className="flex items-center gap-1">
            <RiStore2Line className="w-4 h-4" />
            <span>Defcomm Store</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1">
              <MdOutlineInput className="w-4 h-4" />
              <button className="hover:underline focus:ring-2 focus:ring-green-300 rounded px-1">
                Import bookmarks...
              </button>
            </div>

            {/* Current page status */}
            {currentTab && (
              <div className="text-xs text-gray-500 dark:invert dark:brightness-50 truncate max-w-xs">
                {isSearchUrl(currentTab.url) ? "Search results" : "Ready"}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
