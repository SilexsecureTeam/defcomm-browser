import { runUpdate } from "../../src/utils/browserUtil/tauriUpdater";

export function showUpdateModal() {
  const modal = document.getElementById("updateModal");
  const versionEl = document.getElementById("version");
  const notesBox = document.getElementById("notesBox");
  const notesEl = document.getElementById("notes");
  const progressBox = document.getElementById("progressBox");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const installingBox = document.getElementById("installingBox");
  const errorBox = document.getElementById("errorBox");
  const updateBtn = document.getElementById("updateBtn");
  const laterBtn = document.getElementById("laterBtn");
  const closeBtn = document.getElementById("closeBtn");

  modal.style.display = "flex";

  const init = async () => {
    try {
      await runUpdate(
        (percent) => {
          progressBox.classList.remove("hidden");
          progressBar.style.width = percent + "%";
          progressText.textContent = percent + "%";
        },
        () => console.log("Download started"),
        () => installingBox.classList.remove("hidden")
      );
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  };

  updateBtn.onclick = init;
  laterBtn.onclick = closeBtn.onclick = () => {
    modal.style.display = "none";
  };
}
