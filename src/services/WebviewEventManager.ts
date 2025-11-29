import { emit, listen } from "@tauri-apps/api/event";

export interface WebViewNavigationEvent {
  label: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

export interface WebViewLoadingEvent {
  label: string;
  isLoading: boolean;
  url?: string;
}

class WebViewEventManager {
  private navigationCallbacks: Map<
    string,
    (event: WebViewNavigationEvent) => void
  > = new Map();
  private loadingCallbacks: Map<string, (event: WebViewLoadingEvent) => void> =
    new Map();

  constructor() {
    this.setupGlobalListeners();
  }

  private setupGlobalListeners() {
    // Listen for navigation events from webviews
    listen("webview-navigation", (event: any) => {
      const navEvent = event.payload as WebViewNavigationEvent;
      const callback = this.navigationCallbacks.get(navEvent.label);
      if (callback) {
        callback(navEvent);
      }
    });

    // Listen for loading events from webviews
    listen("webview-loading", (event: any) => {
      const loadingEvent = event.payload as WebViewLoadingEvent;
      const callback = this.loadingCallbacks.get(loadingEvent.label);
      if (callback) {
        callback(loadingEvent);
      }
    });
  }

  registerNavigationCallback(
    label: string,
    callback: (event: WebViewNavigationEvent) => void
  ) {
    this.navigationCallbacks.set(label, callback);
  }

  registerLoadingCallback(
    label: string,
    callback: (event: WebViewLoadingEvent) => void
  ) {
    this.loadingCallbacks.set(label, callback);
  }

  unregisterCallbacks(label: string) {
    this.navigationCallbacks.delete(label);
    this.loadingCallbacks.delete(label);
  }

  emitNavigation(event: WebViewNavigationEvent) {
    emit("webview-navigation", event);
  }

  emitLoading(event: WebViewLoadingEvent) {
    emit("webview-loading", event);
  }
}

export const webViewEventManager = new WebViewEventManager();
