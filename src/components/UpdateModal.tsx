import { useState, useEffect } from "react";
import { Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  FiX,
  FiDownload,
  FiClock,
  FiInfo,
  FiAlertTriangle,
  FiRefreshCw,
  FiArrowUpRight,
  FiChevronRight,
} from "react-icons/fi";

type Props = {
  update: Update;
  required?: boolean;
};

export default function DefcommHUDUpdate({ update, required = true }: Props) {
  const [status, setStatus] = useState<
    "ready" | "downloading" | "installing" | "error"
  >("ready");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  // Install update handler
  async function installUpdate() {
    try {
      setStatus("downloading");
      setError(null);

      await update.downloadAndInstall((event) => {
        if (event.event === "Progress") {
          const percent = Math.round(
            (event.data.downloaded / event.data.total) * 100
          );
          setProgress(percent);
        }
      });

      setStatus("installing");
      await new Promise((resolve) => setTimeout(resolve, 800));
      await relaunch();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? `Update failed: ${err.message}`
          : "Unable to complete update. Please try again or download manually."
      );
    }
  }

  function handleClose() {
    if (!required) {
      setExiting(true);
      setTimeout(() => setVisible(false), 300);
    }
  }

  useEffect(() => {
    if (!required) {
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => setVisible(false), 300);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [required]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-28 right-5 z-50 w-full max-w-md transform transition-all duration-300 ease-out ${
        exiting ? "opacity-0 translate-x-[120%]" : "opacity-100 translate-x-0"
      }`}
    >
      <div className="mx-2 bg-gray-900/90 border border-gray-700 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
        {/* HUD Header */}
        <div className="relative bg-gray-800/70 px-5 py-3 flex items-center justify-between border-b border-gray-700 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-700/40 rounded-lg flex items-center justify-center">
              <FiDownload className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400 tracking-wider">
                DEFCOMM UPDATE
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 uppercase">
                {required ? "Required" : "Optional"}{" "}
                <FiChevronRight className="h-3 w-3" />
              </p>
            </div>
          </div>
          {!required && (
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group"
            >
              <FiX className="h-5 w-5 text-gray-400 group-hover:text-green-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-gray-300">
          {/* Version Info */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2">
              <FiInfo className="h-5 w-5 text-green-400" />
              <span className="text-sm">New Version</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-green-400">
                v{update.version}
              </span>
              <FiArrowUpRight className="h-3 w-3 text-gray-400" />
            </div>
          </div>

          {/* Release Notes */}
          {update.body && (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
                <h4 className="text-sm font-medium flex items-center gap-2 text-gray-400">
                  <FiInfo className="h-4 w-4" />
                  Release Notes
                </h4>
              </div>
              <div className="p-3 max-h-32 overflow-y-auto text-sm">
                {update.body.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 mb-2 last:mb-0"
                  >
                    <FiChevronRight className="h-3 w-3 text-green-400 mt-1 flex-shrink-0" />
                    <span>{line.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {status === "downloading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <FiRefreshCw className="h-3 w-3 animate-spin" />
                  Downloading update...
                </div>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <FiAlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">
                  Update Failed
                </p>
                <p className="text-xs text-red-400 mt-1">{error}</p>
              </div>
              <button
                onClick={installUpdate}
                className="text-red-300 hover:text-red-200 transition-colors"
              >
                <FiRefreshCw className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Installing */}
          {status === "installing" && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-900/20 rounded-lg">
              <FiRefreshCw className="h-5 w-5 text-green-400 animate-spin" />
              <div>
                <p className="text-sm font-medium text-green-300">
                  Installing update
                </p>
                <p className="text-xs text-green-400">
                  Application will restart automatically
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {!required && status === "ready" && (
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiClock className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
                Remind later
              </button>
            )}

            <button
              onClick={installUpdate}
              disabled={status !== "ready"}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 min-w-[140px] group ${
                status === "ready"
                  ? "bg-green-400 text-gray-900 hover:bg-green-500 shadow-md hover:shadow-lg active:scale-[0.98]"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed disabled:opacity-50"
              }`}
            >
              {status === "ready" && (
                <>
                  <FiDownload className="h-4 w-4" />
                  Update Now
                </>
              )}
              {status === "downloading" && (
                <>
                  <FiRefreshCw className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              )}
              {status === "installing" && (
                <>
                  <FiRefreshCw className="h-4 w-4 animate-spin" />
                  Installing...
                </>
              )}
              {status === "error" && (
                <>
                  <FiAlertTriangle className="h-4 w-4" />
                  Try Again
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
              {required ? (
                <>
                  <FiAlertTriangle className="h-3 w-3" />
                  This update is required to continue using Defcomm.
                </>
              ) : (
                <>
                  <FiInfo className="h-3 w-3" />
                  This update includes new features and improvements.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
