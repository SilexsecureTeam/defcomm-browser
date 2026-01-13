import { useEffect } from "react";
import BrowserView from "./layout/BrowserView";
import NavigationBar from "./layout/NavigationBar";
import { useTabStore } from "./stores/tabStore";
import { useTauriUpdater } from "./hooks/useTauriUpdater";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

function App() {
  const { loadFromStore, isLoaded } = useTabStore();
  const { update } = useTauriUpdater();

  useEffect(() => {
    loadFromStore();
  }, [loadFromStore]);

  useEffect(() => {
    if (update) {
      const mainWindow = getCurrentWindow();

      const overlay = new Webview(mainWindow, "update-overlay", {
        url: "updater/update.html",
        transparent: true,
        focus: true,
        width: 400,
        height: 300,
        x: 0,
        y: 100,
      });

      mainWindow.onCloseRequested(() => {
        overlay.close();
      });
    }
  }, [update]);

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
