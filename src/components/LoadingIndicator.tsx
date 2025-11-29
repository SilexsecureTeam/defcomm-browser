// components/LoadingIndicator.tsx
import { motion } from "framer-motion";

interface LoadingIndicatorProps {
  isLoading: boolean;
  isSearching?: boolean;
  size?: "small" | "medium";
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  isSearching = false,
  size = "small",
}) => {
  if (!isLoading) return null;

  const dimensions = size === "small" ? "w-3 h-3" : "w-4 h-4";

  return (
    <div className="flex items-center justify-center">
      {isSearching ? (
        // Searching animation (magnifying glass)
        <motion.div
          className={`${dimensions} border border-blue-500 rounded-full`}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5" />
        </motion.div>
      ) : (
        // Regular loading spinner
        <motion.div
          className={`${dimensions} border-2 border-gray-300 border-t-blue-500 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
};
