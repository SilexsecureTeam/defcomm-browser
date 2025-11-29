import { Webview } from "@tauri-apps/api/webview";
import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  url: string;
  title: string;
  favicon?: string;
}

let cachedWindow: Awaited<ReturnType<typeof getCurrentWindow>> | null = null;
async function getMainWindow() {
  if (!cachedWindow) cachedWindow = await getCurrentWindow();
  return cachedWindow;
}

class WebViewManager {
  private views = new Map<string, Webview>();
  private navigationStates = new Map<string, NavigationState>();
  private containerElements = new Map<string, HTMLElement>();
  private resizeObserver: ResizeObserver | null = null;
  private isBeingDestroyed = new Set<string>();
  private pendingResizeUpdates = new Map<string, NodeJS.Timeout>();
  private creationPromises = new Map<string, Promise<Webview | null>>();
  private lastUrls = new Map<string, string>();
  private activeTabLabels = new Set<string>(); // Track active tabs manually
  private globalPollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupResizeObserver();
    console.log("[WebViewManager] ✅ Initialized");
  }

  // ------------------------- OPTIMIZED METADATA POLLING -------------------------

  // Call this when a tab becomes active
  setTabActive(label: string) {
    this.activeTabLabels.add(label);
    console.log(`[WebViewManager] 🎯 Tab ${label} marked as active`);

    // Start polling if not already running
    if (!this.globalPollInterval) {
      this.startGlobalPolling();
    }

    // Immediately poll the newly active tab
    setTimeout(() => {
      this.pollTabMetadata(label);
    }, 1000);
  }

  // Call this when a tab becomes inactive
  setTabInactive(label: string) {
    this.activeTabLabels.delete(label);
    console.log(`[WebViewManager] 🚫 Tab ${label} marked as inactive`);

    // Stop polling if no active tabs left
    if (this.activeTabLabels.size === 0) {
      this.stopGlobalPolling();
    }
  }

  private startGlobalPolling() {
    if (this.globalPollInterval) {
      return;
    }

    console.log("[WebViewManager] 🔄 Starting global polling for active tabs");

    this.globalPollInterval = setInterval(() => {
      this.pollActiveTabs();
    }, 4000); // Poll every 4 seconds
  }

  private stopGlobalPolling() {
    if (this.globalPollInterval) {
      clearInterval(this.globalPollInterval);
      this.globalPollInterval = null;
      console.log(
        "[WebViewManager] ⏹️ Stopped global polling (no active tabs)"
      );
    }
  }

  private pollActiveTabs() {
    const activeLabels = Array.from(this.activeTabLabels).filter(
      (label) => !this.isBeingDestroyed.has(label) && this.views.has(label)
    );

    if (activeLabels.length === 0) {
      console.log("[WebViewManager] 🔄 No active tabs to poll - stopping");
      this.stopGlobalPolling();
      return;
    }

    console.log(
      `[WebViewManager] 🔄 Polling ${activeLabels.length} active tabs`
    );

    // Poll each active tab
    activeLabels.forEach((label) => {
      this.pollTabMetadata(label);
    });
  }

  private async pollTabMetadata(label: string) {
    if (this.isBeingDestroyed.has(label) || !this.views.has(label)) {
      this.activeTabLabels.delete(label);
      return;
    }

    try {
      const currentState = this.navigationStates.get(label);
      const currentUrl = currentState?.url || "";

      if (!currentUrl || currentUrl === "newtab") return;

      const lastUrl = this.lastUrls.get(label);
      const urlChanged = currentUrl !== lastUrl;

      // Use direct HTTP metadata fetching
      const meta = await this.getMetadataDirect(currentUrl);

      const currentTitle = currentState?.title || "";
      const shouldUpdate =
        urlChanged || (meta.title && meta.title !== currentTitle);

      if (shouldUpdate) {
        console.log(`[WebViewManager] 🔄 Updating ${label}:`, {
          oldTitle: currentTitle,
          newTitle: meta.title,
        });

        this.updateNavigationState(label, {
          url: meta.url || currentUrl,
          title: meta.title || currentTitle,
          favicon: meta.icon,
        });

        this.lastUrls.set(label, meta.url || currentUrl);

        // Emit to React components
        try {
          await emit("webview-title-changed", {
            label: label,
            title: meta.title || currentTitle,
            url: meta.url || currentUrl,
            icon: meta.icon,
          });
        } catch (emitError) {
          console.error(`[WebViewManager] ❌ Event emit failed:`, emitError);
        }
      }
    } catch (err) {
      console.error(`[WebViewManager] Polling error for ${label}:`, err);
    }
  }

  private async getMetadataDirect(url: string): Promise<any> {
    try {
      const json = await invoke<string>("get_page_metadata_simple", {
        url: url,
      });
      return JSON.parse(json);
    } catch (error) {
      console.error(`[WebViewManager] ❌ Metadata fetch failed:`, error);
      return {
        url: url,
        title: this.extractTitleFromUrl(url),
        icon: "",
        description: "",
      };
    }
  }

  // ------------------------- GEOMETRY -------------------------

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const container = entry.target as HTMLElement;
        const label = container.getAttribute("data-webview");
        if (
          label &&
          this.views.has(label) &&
          !this.isBeingDestroyed.has(label)
        ) {
          this.scheduleBoundsUpdate(label, container);
        }
      });
    });
  }

  private scheduleBoundsUpdate(label: string, container: HTMLElement) {
    if (this.pendingResizeUpdates.has(label)) {
      clearTimeout(this.pendingResizeUpdates.get(label)!);
    }

    const timeout = setTimeout(() => {
      this.pendingResizeUpdates.delete(label);
      this.updateWebViewBoundsFromContainer(label, container);
    }, 50);

    this.pendingResizeUpdates.set(label, timeout);
  }

  private async updateWebViewBoundsFromContainer(
    label: string,
    container: HTMLElement
  ) {
    const webview = this.views.get(label);
    if (!webview || !container || this.isBeingDestroyed.has(label)) return;

    try {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      if (width < 10 || height < 10) return;

      await Promise.all([
        webview
          .setPosition(
            new LogicalPosition(Math.floor(rect.left), Math.floor(rect.top))
          )
          .catch(() => {}),
        webview.setSize(new LogicalSize(width, height)).catch(() => {}),
      ]);
    } catch {
      // ignore geometry errors
    }
  }

  // ------------------------- PUBLIC API -------------------------

  async ensureView(
    label: string,
    url: string,
    isVisible: boolean,
    containerElement?: HTMLElement
  ): Promise<Webview | null> {
    if (this.creationPromises.has(label))
      return this.creationPromises.get(label)!;
    if (this.isBeingDestroyed.has(label)) return null;

    const existingWebview = this.views.get(label);
    const currentState = this.navigationStates.get(label);

    if (existingWebview && this.isWebViewValid(label)) {
      if (currentState?.url !== url) {
        // URL changed: recreate to keep things simple & reliable
        await this.closeView(label);
        await this.waitUntilWebviewGone(label);
      } else {
        try {
          if (containerElement) {
            await this.updateWebViewBoundsFromContainer(
              label,
              containerElement
            );
          }
          if (isVisible) {
            await existingWebview.show();
            // Tab is visible, mark as active for polling
            this.setTabActive(label);
          } else {
            await existingWebview.hide();
            // Tab is hidden, mark as inactive
            this.setTabInactive(label);
          }
          return existingWebview;
        } catch {
          // fall through to recreate
        }
      }
    }

    const creationPromise = this.createWebView(
      label,
      url,
      isVisible,
      containerElement
    );
    this.creationPromises.set(label, creationPromise);

    try {
      const webview = await creationPromise;

      // If the tab is visible, mark it as active for polling
      if (isVisible) {
        this.setTabActive(label);
      }

      return webview;
    } finally {
      this.creationPromises.delete(label);
    }
  }

  private async createWebView(
    label: string,
    url: string,
    _isVisible: boolean,
    containerElement?: HTMLElement
  ): Promise<Webview | null> {
    if (this.isBeingDestroyed.has(label)) return null;

    const appWindow = await getMainWindow();

    if (containerElement) {
      const oldContainer = this.containerElements.get(label);
      if (oldContainer && oldContainer !== containerElement) {
        this.resizeObserver?.unobserve(oldContainer);
      }
      this.containerElements.set(label, containerElement);
      this.resizeObserver?.observe(containerElement);
    }

    try {
      let bounds = { x: 0, y: 0, width: 800, height: 600 };

      if (containerElement) {
        const rect = containerElement.getBoundingClientRect();
        bounds = {
          x: Math.floor(rect.left),
          y: Math.floor(rect.top),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        };
      }

      const webview = new Webview(appWindow, label, {
        url,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });

      this.views.set(label, webview);
      this.navigationStates.set(label, {
        canGoBack: false,
        canGoForward: false,
        isLoading: true,
        url,
        title: "Loading…",
      });

      // Initialize last URL
      this.lastUrls.set(label, url);

      console.log(`[WebViewManager] ✅ Created webview ${label} for ${url}`);
      return webview;
    } catch (error: any) {
      this.cleanupWebView(label);
      throw error;
    }
  }

  private updateNavigationState(
    label: string,
    updates: Partial<NavigationState>
  ) {
    const current = this.navigationStates.get(label) || {
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      url: "",
      title: "",
    };

    const newState = { ...current, ...updates };
    this.navigationStates.set(label, newState);
  }

  // ------------------------- CLEANUP -------------------------

  private cleanupWebView(label: string) {
    this.views.delete(label);
    this.navigationStates.delete(label);
    this.lastUrls.delete(label);
    this.activeTabLabels.delete(label);
    this.isBeingDestroyed.delete(label);

    const container = this.containerElements.get(label);
    if (container) {
      this.resizeObserver?.unobserve(container);
      this.containerElements.delete(label);
    }

    // Stop polling if no active tabs left
    if (this.activeTabLabels.size === 0) {
      this.stopGlobalPolling();
    }
  }

  async closeView(label: string) {
    if (this.pendingResizeUpdates.has(label)) {
      clearTimeout(this.pendingResizeUpdates.get(label)!);
      this.pendingResizeUpdates.delete(label);
    }

    const webview = this.views.get(label);
    const container = this.containerElements.get(label);

    if (container) {
      this.resizeObserver?.unobserve(container);
      this.containerElements.delete(label);
    }

    if (!webview) return;

    try {
      this.isBeingDestroyed.add(label);
      await webview.hide();
      await webview.close();
    } finally {
      this.cleanupWebView(label);
    }
  }

  async removeView(label: string) {
    await this.closeView(label);
  }

  getView(label: string) {
    return this.views.get(label);
  }

  hasView(label: string) {
    return this.views.has(label) && !this.isBeingDestroyed.has(label);
  }

  async updateBoundsFromContainer(
    label: string,
    containerElement: HTMLElement
  ) {
    if (this.isBeingDestroyed.has(label)) return;
    const webview = this.views.get(label);
    if (!webview) return;
    await this.updateWebViewBoundsFromContainer(label, containerElement);
  }

  async destroyAll() {
    this.stopGlobalPolling();

    for (const timeout of this.pendingResizeUpdates.values())
      clearTimeout(timeout);
    this.pendingResizeUpdates.clear();

    for (const container of this.containerElements.values()) {
      this.resizeObserver?.unobserve(container);
    }
    this.containerElements.clear();

    const promises = Array.from(this.views.keys()).map((label) =>
      this.closeView(label)
    );
    await Promise.all(promises);

    console.log(`[WebViewManager] 🗑️ Destroyed all webviews`);
  }

  getNavigationState(label: string) {
    return (
      this.navigationStates.get(label) || {
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        url: "",
        title: "",
      }
    );
  }

  isWebViewValid(label: string) {
    return this.views.has(label) && !this.isBeingDestroyed.has(label);
  }

  private extractTitleFromUrl(url: string) {
    try {
      if (!url || url === "newtab") return "New Tab";
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace("www.", "");
      if (hostname.includes(".")) {
        const base = hostname.split(".")[0];
        return base.charAt(0).toUpperCase() + base.slice(1);
      }
      return hostname;
    } catch {
      return "Website";
    }
  }

  private async waitUntilWebviewGone(label: string) {
    let retries = 0;
    while (this.isWebViewValid(label) && retries < 20) {
      await new Promise((res) => setTimeout(res, 50));
      retries++;
    }
  }

  private previewView: Webview | null = null;

  async showPreview(
    x: number,
    y: number,
    tab: { title: string; url: string; icon?: string }
  ) {
    const appWindow = await getMainWindow();

    const width = 256;
    const height = 160;

    if (!this.previewView) {
      // Load a small route in your frontend like /preview?...
      this.previewView = new Webview(appWindow, "tab-preview-overlay", {
        url: `tauri://localhost/preview.html`, // or /#/preview
        x,
        y,
        width,
        height,
      });
    } else {
      await this.previewView.setPosition(new LogicalPosition(x, y));
      await this.previewView.setSize(new LogicalSize(width, height));
    }

    // Send tab data into that preview webview
    await emit("tab-preview-data", {
      title: tab.title,
      url: tab.url,
      icon: tab.icon,
    });

    await this.previewView.show();
  }

  async hidePreview() {
    if (!this.previewView) return;
    await this.previewView.hide();
  }
}

export const webViewManager = new WebViewManager();
