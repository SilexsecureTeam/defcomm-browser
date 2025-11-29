// src/App.tsx
import { useEffect } from "react";
import "./App.css";
import BrowserView from "./layout/BrowserView";
import NavigationBar from "./layout/NavigationBar";
import { useTabStore } from "./stores/tabStore";

function App() {
  const { loadFromStore, isLoaded } = useTabStore();

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
      <NavigationBar />
      <main className="flex-1">
        <BrowserView />
      </main>
    </div>
  );
}

export default App;
