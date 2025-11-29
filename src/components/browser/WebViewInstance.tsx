import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { webViewManager } from "../../services/WebViewManager";
import { listen } from "@tauri-apps/api/event";

interface WebViewInstanceProps {
  id: number;
  url: string;
  isActive: boolean;
}

const shouldUseCustomView = (url: string): boolean => {
  if (!url || url === "/") return false;
  return [/defcomm:\/\//, /internal:\/\//].some((p) => p.test(url));
};

export default function WebViewInstance({
  id,
  url,
  isActive,
}: WebViewInstanceProps) {
  const label = useMemo(() => `tab-webview-${id}`, [id]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerReady, setContainerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isActiveRef = useRef(isActive);
  const urlRef = useRef(url);

  useEffect(() => {
    isActiveRef.current = isActive;
    urlRef.current = url;
  }, [isActive, url]);

  // Wait for container to have size before attaching a webview
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const rect = containerRef.current!.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setContainerReady(true);
      } else {
        setTimeout(tick, 50);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [label]);

  // MAIN WEBVIEW MANAGEMENT
  useEffect(() => {
    if (!containerReady || !containerRef.current) return;

    if (shouldUseCustomView(url)) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const run = async () => {
      try {
        const webview = await webViewManager.ensureView(
          label,
          url,
          isActive,
          containerRef.current!
        );
        if (!webview) throw new Error("Webview creation returned null");
        setIsLoading(false);
      } catch (err: any) {
        if (!/already exists|not found/.test(err.message)) {
          setIsLoading(false);
          setHasError(true);
        } else {
          console.error(`[WebView ${label}] Webview management failed:`, err);
        }
      }
    };
    run();
  }, [label, url, containerReady, isActive]);

  // OPTIONAL: react to generic lifecycle events if you emit them
  useEffect(() => {
    let unlistenLoad: (() => void) | null = null;
    let unlistenNav: (() => void) | null = null;

    const setup = async () => {
      unlistenLoad = await listen<{ label: string; isLoading: boolean }>(
        "webview-loading",
        (event) => {
          const { label: evLabel, isLoading } = event.payload;
          if (evLabel === label && isActiveRef.current) {
            setIsLoading(isLoading);
            if (!isLoading) setHasError(false);
          }
        }
      );

      unlistenNav = await listen<{ label: string }>(
        "webview-navigation",
        (event) => {
          const { label: evLabel } = event.payload;
          if (evLabel === label && isActiveRef.current) {
            setIsLoading(false);
            setHasError(false);
          }
        }
      );
    };

    setup();
    return () => {
      unlistenLoad?.();
      unlistenNav?.();
    };
  }, [label]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewManager.removeView(label).catch(console.error);
  }, [label]);

  // CUSTOM INTERNAL PAGE
  if (shouldUseCustomView(url)) {
    return (
      <div
        className={`absolute inset-0 w-full h-full ${
          isActive ? "block" : "hidden"
        }`}
      >
        <div className="w-full h-full bg-white p-8">
          <h1>Internal Page</h1>
          <p>This is a custom internal page for: {url}</p>
        </div>
      </div>
    );
  }

  // NORMAL WEBVIEW CONTAINER
  return (
    <div
      ref={containerRef}
      data-webview={label}
      className={`absolute inset-0 w-full h-full ${
        isActive ? "block" : "hidden"
      }`}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {isLoading && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading {url}</p>
          </div>
        </div>
      )}

      {hasError && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <p className="text-sm text-gray-700 mb-2">
              Failed to load the page
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
