import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";

export type UpdateInfo = {
  version: string;
  notes?: string;
  date?: string;
};

export function useTauriUpdater() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        if (!(await isTauri())) {
          setChecking(false);
          return;
        }

        const { check } = await import("@tauri-apps/plugin-updater");
        const result = await check();

        if (result?.available) {
          setUpdate({
            version: result.version,
            notes:
              (result.body as string | undefined) ||
              (result.rawJson?.notes as string | undefined),
            date: result.date,
          });
        }
      } catch (err: any) {
        console.error("Updater check failed:", err);
        setError(err?.message || "Updater failed");
      } finally {
        setChecking(false);
      }
    }

    run();
  }, []);

  return { update, checking, error };
}
