import { useEffect } from "react";
import "./App.css";
import BrowserView from "./layout/BrowserView";
import NavigationBar from "./layout/NavigationBar";
import { useTabStore } from "./stores/tabStore";
import { useTauriUpdater } from "./hooks/useTauriUpdater";
import UpdateModal from "./components/UpdateModal";

function App() {
  const { loadFromStore, isLoaded } = useTabStore();
  const { update } = useTauriUpdater();

  useEffect(() => {
    loadFromStore();
  }, [loadFromStore]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading browser...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {update && <UpdateModal version={update.version} notes={update.notes} />}

      <NavigationBar />
      <main className="flex-1">
        <BrowserView />
      </main>
    </div>
  );
}

export default App;
