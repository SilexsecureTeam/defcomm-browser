import { runUpdate } from "./runUpdate";

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

// Max delay for "Later" button (5 days)
const MAX_LATER_DAYS = 5;

// Store the last postpone date in localStorage
const LAST_LATER_KEY = "update_later_until";

// Show modal
modal.style.display = "flex";

export async function showUpdateModal(updateData) {
  versionEl.textContent = updateData.version;

  // Show release notes if available
  if (updateData.body) {
    notesBox.classList.remove("hidden");
    notesEl.innerHTML = "";
    updateData.body.split("\n").forEach((line) => {
      const div = document.createElement("div");
      div.textContent = line;
      notesEl.appendChild(div);
    });
  }

  // Determine if "Later" button should show
  const releaseTime = updateData.releaseDate
    ? new Date(updateData.releaseDate).getTime()
    : 0;
  const now = Date.now();
  const laterUntil = localStorage.getItem(LAST_LATER_KEY);
  const isLaterAllowed = !laterUntil || now < Number(laterUntil);

  if (
    isLaterAllowed &&
    releaseTime > 0 &&
    now - releaseTime < MAX_LATER_DAYS * 24 * 60 * 60 * 1000
  ) {
    laterBtn.classList.remove("hidden");
    closeBtn.classList.remove("hidden");
  }

  // Update Now handler
  updateBtn.onclick = async () => {
    // Show loader immediately
    progressBox.classList.remove("hidden");
    progressBar.style.width = "0%";
    progressText.textContent = "0%";
    updateBtn.disabled = true;

    try {
      await runUpdate(
        (percent) => {
          progressBar.style.width = percent + "%";
          progressText.textContent = percent + "%";
        },
        (total) => console.log("Download started:", total),
        () => installingBox.classList.remove("hidden")
      );
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
    }
  };

  // Later / Close handlers
  laterBtn.onclick = closeBtn.onclick = () => {
    const expire = Date.now() + MAX_LATER_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(LAST_LATER_KEY, expire.toString());
    modal.style.display = "none";
  };
}
