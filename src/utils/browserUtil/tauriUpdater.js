import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function runUpdate(onProgress, onStarted, onFinished) {
  const update = await check();
  if (!update) return null;

  // Split release notes into lines for UI display
  if (update.body) {
    update.body = update.body.split("\n");
  }

  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        total = event.data.contentLength;
        if (onStarted) onStarted(total);
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        if (onProgress && total > 0) {
          onProgress(Math.floor((downloaded / total) * 100));
        }
        break;
      case "Finished":
        if (onFinished) onFinished();
        break;
    }
  });

  await relaunch(); // restart app automatically
  return update;
}
