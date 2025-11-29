import { useState, useEffect } from "react";

interface TabPreviewProps {
  tab: {
    id: number;
    title: string;
    url: string;
    description?: string;
    icon?: string;
  };
  position: { x: number; y: number };
  isVisible: boolean;
}

export default function TabPreview({
  tab,
  position,
  isVisible,
}: TabPreviewProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
    } else {
      // Delay unmount for smooth animation
      const timer = setTimeout(() => setIsMounted(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isMounted || !isVisible) return null;

  return (
    <div
      className="fixed z-[99999999999999999999] bg-white dark:bg-[#2b2b2b] rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 w-64 transform transition-all duration-150"
      style={{
        left: position.x,
        top: position.y + 45, // Chrome positions it right below the tab
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? 0 : -8}px)`,
      }}
    >
      {/* Preview Image/Screenshot Area - Chrome shows actual page preview */}
      <div className="w-full h-32 bg-gray-100 dark:bg-[#1e1e1e] border-b border-gray-300 dark:border-gray-600 flex items-center justify-center rounded-t-lg">
        {tab.icon ? (
          <img
            src={tab.icon}
            alt=""
            className="w-8 h-8"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        ) : (
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            No preview
          </div>
        )}
      </div>

      {/* Content Area - Chrome style compact layout */}
      <div className="p-2">
        {/* Title - Chrome uses single line with ellipsis */}
        <h3 className="text-[13px] font-normal text-gray-900 dark:text-gray-100 truncate mb-1 leading-tight">
          {tab.title || "New Tab"}
        </h3>

        {/* URL - Chrome shows full URL in smaller, lighter text */}
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mb-2 leading-tight">
          {tab.url.replace(/^https?:\/\//, "")}
        </p>

        {/* Description - Chrome shows 2 lines max when available */}
        {tab.description && (
          <p className="text-[12px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-tight">
            {tab.description}
          </p>
        )}
      </div>
    </div>
  );
}
