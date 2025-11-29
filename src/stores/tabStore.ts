import { create } from "zustand";
import { storeGet, storeSet } from "../utils/store";
import { webViewManager } from "../services/WebViewManager";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// ---------- Types ----------
interface Tab {
  id: number;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
}

interface TabStore {
  tabs: Tab[];
  activeTab: number | null;
  isLoaded: boolean;

  setActiveTab: (id: number) => void;
  addTab: (tab?: Partial<Tab>) => Promise<void>;
  closeTab: (id: number) => Promise<void>;

  updateTab: (id: number, updates: Partial<Tab>) => void;
  updateTabUrl: (id: number, url: string) => void;
  updateTabFromMetadata: (
    id: number,
    metadata: Partial<Pick<Tab, "title" | "url" | "icon" | "description">>
  ) => void;

  goBack: (id: number) => void;
  goForward: (id: number) => void;
  reload: (id: number) => void;

  saveToStore: () => Promise<void>;
  loadFromStore: () => Promise<void>;
}

// ---------- Helpers ----------
const generateTabTitle = (url: string): string => {
  if (!url || url === "newtab") return "New Tab";
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const base = hostname.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Website";
  }
};

// ---------- Zustand Store ----------
export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTab: null,
  isLoaded: false,

  setActiveTab: (id) => {
    set({ activeTab: id });
    get().saveToStore();
  },

  addTab: async (tab = {}) => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const url = tab.url ?? "";
    const newTab: Tab = {
      id: newId,
      title: tab.title ?? generateTabTitle(url),
      url,
      icon: tab.icon ?? "./defcomm.png",
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      ...tab,
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTab: newId,
    }));

    await get().saveToStore();
  },

  closeTab: async (id) => {
    const { tabs, activeTab } = get();

    if (webViewManager.hasView(`tab-webview-${id}`)) {
      await webViewManager.closeView(`tab-webview-${id}`).catch(console.error);
    }

    const updatedTabs = tabs.filter((t) => t.id !== id);
    const newActiveTab =
      activeTab === id
        ? updatedTabs[Math.max(0, updatedTabs.length - 1)]?.id ?? null
        : activeTab;

    set({ tabs: updatedTabs, activeTab: newActiveTab });
    await get().saveToStore();
  },

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    get().saveToStore();
  },

  // Never overwrite a real title with fallback
  updateTabUrl: (id, url) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id !== id
          ? t
          : {
              ...t,
              url,
              title:
                t.title && t.title !== generateTabTitle(t.url)
                  ? t.title
                  : generateTabTitle(url),
            }
      ),
    }));
    get().saveToStore();
  },

  updateTabFromMetadata: (id, metadata) => {
    const { title, url, icon, description } = metadata;
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              title: (title && title.trim()) || t.title,
              url: url || t.url,
              icon: icon || t.icon,
              description: description || t.description,
              isLoading: false,
            }
          : t
      ),
    }));
    get().saveToStore();
  },

  goBack: (id) => console.log("Back nav not supported:", id),
  goForward: (id) => console.log("Forward nav not supported:", id),

  reload: async (id) => {
    useTabStore.getState().updateTab(id, { isLoading: true });
    const label = `tab-webview-${id}`;
    try {
      await invoke("eval_in_webview", {
        label,
        script: "window.location.reload();",
      });
    } catch {
      await webViewManager.removeView(label);
    }
  },

  saveToStore: async () => {
    const { tabs, activeTab } = get();
    await storeSet("tabs", tabs);
    await storeSet("activeTab", activeTab);
  },

  loadFromStore: async () => {
    const savedTabs = await storeGet<Tab[]>("tabs");
    const savedActiveTab = await storeGet<number>("activeTab");

    if (savedTabs?.length) {
      set({
        tabs: savedTabs,
        activeTab: savedActiveTab || savedTabs[0].id,
        isLoaded: true,
      });
    } else {
      const defaultTab: Tab = {
        id: Date.now(),
        title: "Connect to Defcomm",
        url: "https://defcomm.ng",
        icon: "./globe.jpg",
        isLoading: false,
      };
      set({ tabs: [defaultTab], activeTab: defaultTab.id, isLoaded: true });
    }
  },
}));

// ---------- Single global metadata listener ----------
let __metaListenerInitialized = false;

(async function initializeMetadataListener() {
  if (__metaListenerInitialized) return;
  __metaListenerInitialized = true;

  console.log("[TabStore] 🔧 Initializing metadata listener...");

  try {
    await listen<{
      label: string;
      url: string;
      title: string;
      icon?: string;
    }>("webview-title-changed", ({ payload }) => {
      console.log(
        "[TabStore] 📢 RECEIVED webview-title-changed event:",
        payload
      );

      if (!payload?.label) {
        console.error("[TabStore] ❌ No label in payload");
        return;
      }

      const id = parseInt(
        String(payload.label).replace("tab-webview-", ""),
        10
      );

      if (!Number.isFinite(id)) {
        console.error(
          "[TabStore] ❌ Invalid tab ID from label:",
          payload.label
        );
        return;
      }

      console.log(
        `[TabStore] 🎯 Updating tab ${id} with title: "${payload.title}"`
      );

      useTabStore.getState().updateTabFromMetadata(id, {
        url: payload.url,
        title: payload.title,
        icon: payload.icon,
      });

      // Verify the update worked
      const updatedTab = useTabStore.getState().tabs.find((t) => t.id === id);
      console.log(`[TabStore] ✅ Tab ${id} updated to: "${updatedTab?.title}"`);
    });

    console.log("[TabStore] ✅ Metadata listener registered successfully");
  } catch (error) {
    console.error(
      "[TabStore] ❌ Failed to initialize metadata listener:",
      error
    );
  }
})();
