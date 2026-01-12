import { useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";

type Props = {
  version: string;
  notes?: string;
};

export default function UpdateModal({ version, notes }: Props) {
  const [installing, setInstalling] = useState(false);

  async function handleInstall() {
    try {
      setInstalling(true);
      const { install } = await import("@tauri-apps/plugin-updater");
      await install();
      await relaunch();
    } catch (err) {
      console.error("Update failed:", err);
      setInstalling(false);
      alert("Update failed. Please restart the app.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Update Available
        </h2>

        <p className="text-gray-700 mb-4">
          Version <strong>{version}</strong> is ready to install.
        </p>

        {notes && (
          <div className="max-h-40 overflow-auto rounded bg-gray-50 p-3 text-sm text-gray-700 mb-4">
            {notes}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            disabled={installing}
            onClick={handleInstall}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {installing ? "Installing…" : "Install & Restart"}
          </button>
        </div>
      </div>
    </div>
  );
}
