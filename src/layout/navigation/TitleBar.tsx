import { useState } from "react";
import { FiX, FiMinus, FiSquare, FiCopy } from "react-icons/fi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import TabManager from "./TabManager";
export default function TitleBar() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const minimize = () => appWindow.minimize();
  const toggleMaximize = async () => {
    const max = await appWindow.isMaximized();
    max ? appWindow.unmaximize() : appWindow.maximize();
    setIsMaximized(!max);
  };
  const close = () => appWindow.close();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-100 bg-primary dark:bg-primary-dark text-primaryTabText dark:text-primaryTabText-dark flex items-center justify-between h-12 px-3 pb-2"
      data-tauri-drag-region
    >
      {/* ---------- Tabs Section ---------- */}
      <TabManager />

      {/* ---------- Window Controls ---------- */}
      <div
        className="shrink-0 flex items-center gap-1 px-2"
        data-tauri-drag-region={false}
      >
        <button
          className="p-1 hover:bg-primaryTab/70 dark:hover:bg-primaryTab-dark/70 rounded"
          onClick={minimize}
        >
          <FiMinus size={18} />
        </button>
        <button
          className="p-1 hover:bg-primaryTab/70 dark:hover:bg-primaryTab-dark/70 rounded"
          onClick={toggleMaximize}
        >
          {isMaximized ? <FiCopy size={18} /> : <FiSquare size={18} />}
        </button>
        <button
          className="p-1 hover:bg-red-500 hover:text-white rounded"
          onClick={close}
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}
