import { useEffect } from "react";
import BrowserView from "./layout/BrowserView";
import NavigationBar from "./layout/NavigationBar";
import { useTabStore } from "./stores/tabStore";
import { useTauriUpdater } from "./hooks/useTauriUpdater";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

function App() {
  const { loadFromStore, isLoaded } = useTabStore();
  const { update } = useTauriUpdater();

  useEffect(() => {
    loadFromStore();
  }, [loadFromStore]);

  // useEffect(() => {
  //   if (!update) {
  //     const webview = new WebviewWindow("update-overlay", {
  //       url: "update.html",
  //       title: "Update Available",
  //       width: 400,
  //       height: 300,
  //       resizable: false,
  //       alwaysOnTop: true,
  //       decorations: false, // Set to false for a clean "overlay" look
  //       transparent: true,
  //     });

  //     webview.once("tauri://error", (e) => {
  //       console.error("Failed to create update window", e);
  //     });
  //   }
  // }, [update]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-900">Loading browser...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <NavigationBar />
      <main className="flex-1">
        <BrowserView />
      </main>
    </div>
  );
}

export default App;
