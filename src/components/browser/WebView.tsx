import { useEffect, useRef } from "react";
import { Webview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WebViewProps {
  id: number;
  url: string;
  isActive: boolean;
}

export default function WebView({ id, url, isActive }: WebViewProps) {
  const webviewRef = useRef<Webview | null>(null);
  const label = `tab-webview-${id}`;

  useEffect(() => {
    //   let active = true;

    async function createWebview() {
      const appWindow = getCurrentWindow();

      // Avoid duplicate creation
      const existing = await Webview.getByLabel(label);
      if (existing) {
        webviewRef.current = existing;
        //await existing.setFocus(isActive);
        return;
      }

      const webview = new Webview(appWindow, label, {
        url,
        x: 0,
        y: 36, // offset below your titlebar
        width: 1200,
        height: 760,
        //visible: isActive,
        focus: isActive,
      });

      webview.once("tauri://created", () => {
        console.log(`[WebView ${label}] created for ${url}`);
      });

      webview.once("tauri://error", (e) => {
        console.error(`[WebView ${label}] error`, e);
      });

      webviewRef.current = webview;
    }

    createWebview();

    return () => {
      isActive = false;
      (async () => {
        const wv = await Webview.getByLabel(label);
        if (wv) await wv.hide();
      })();
    };
  }, [label, url]);

  // Toggle visibility when tab switches
  useEffect(() => {
    const toggleVisibility = async () => {
      const wv = await Webview.getByLabel(label);
      if (!wv) return;
      if (isActive) {
        await wv.show();
        // await wv.setFocus(true);
      } else {
        await wv.hide();
      }
    };
    toggleVisibility();
  }, [isActive]);

  return null; // It renders natively, not in DOM
}
