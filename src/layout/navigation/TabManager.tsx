// components/TabManager.tsx
import { useState, useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import { GoPlus } from "react-icons/go";
import { useTabStore } from "../../stores/tabStore";
import TabPreview from "../../components/browser/TabPreview";
import { TabIcon } from "../../components/browser/TabIcon";

const TabManager = () => {
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { tabs, activeTab, setActiveTab, addTab, closeTab } = useTabStore();

  const handleMouseEnter = (tabId: number, event: React.MouseEvent) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set hover state immediately
    setHoveredTab(tabId);

    // Calculate position for preview
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewPosition({
      x: rect.left,
      y: rect.top,
    });

    // Show preview after a short delay (like browsers do)
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    setHoveredTab(null);
    setShowPreview(false);
  };

  const handleTabClick = (tabId: number) => {
    setActiveTab(tabId);
    setShowPreview(false);
    setHoveredTab(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const hoveredTabData = tabs.find((tab) => tab.id === hoveredTab);

  return (
    <div
      data-tauri-drag-region={false}
      className="flex-1 w-full max-w-[80%] flex items-center h-full pr-2 relative"
    >
      <div className="flex items-center h-full overflow-hidden bg-primaryTab dark:bg-primaryTab-dark">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          const isLast = tabs[tabs.length - 1].id === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onMouseEnter={(e) => handleMouseEnter(tab.id, e)}
              onMouseLeave={handleMouseLeave}
              className={`group min-w-10 max-w-32 flex items-center h-full cursor-pointer transition-all duration-150 relative flex-1 border
                    ${
                      isActive
                        ? "bg-primaryTab-active dark:bg-primaryTab-active-dark text-primaryTabText-active dark:text-primaryTabText-active-dark shadow-sm font-medium rounded-br-lg border-gray-400"
                        : "bg-primaryTab dark:bg-primaryTab-dark text-primaryTabText dark:text-primaryTabText-dark font-light hover:bg-primaryTab-active/10 dark:hover:bg-primaryTab-active-dark/10 border-transparent"
                    } ${isLast && isActive && "rounded-br-none"} `}
              data-tauri-drag-region={false}
            >
              <div className="w-full flex items-center px-3">
                {
                  <TabIcon
                    icon={tab.icon}
                    url={tab.url}
                    alt={tab.title || "Tab icon"}
                  />
                }

                <span
                  className={`truncate flex-1 min-w-0 ml-2 ${
                    tab.icon ? "text-[10px]" : "text-[12px]"
                  } font-medium`}
                  //title={tab.title}
                >
                  {tab.title || "New Tab"}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`${
                    (isHovered || isActive) && tabs.length > 1
                      ? "opacity-100"
                      : "opacity-0"
                  } shrink-0 w-4 h-4 flex items-center justify-center rounded-sm hover:bg-gray-300/70 transition-colors`}
                >
                  <FiX size={10} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => addTab()}
        className="shrink-0 flex items-center justify-center w-7 h-full bg-white text-primaryTab-dark hover:bg-gray-100 transition-colors border-r border-gray-300 rounded-br-lg"
        data-tauri-drag-region={false}
      >
        <GoPlus size={14} />
      </button>

      {/* Tab Preview */}
      {hoveredTabData && (
        <TabPreview
          tab={hoveredTabData}
          position={previewPosition}
          isVisible={showPreview}
        />
      )}
    </div>
  );
};

export default TabManager;
