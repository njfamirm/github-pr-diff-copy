import { DEFAULT_PROMPT, getPrompt } from "./defaults.js";

const box = document.getElementById("prompt");
const status = document.getElementById("status");

function flash(msg) {
  status.textContent = msg;
  setTimeout(() => (status.textContent = ""), 2000);
}

box.value = await getPrompt();

document.getElementById("save").addEventListener("click", async () => {
  const value = box.value.trim();
  if (!value || value === DEFAULT_PROMPT) {
    await chrome.storage.sync.remove("prompt");
    box.value = DEFAULT_PROMPT;
  } else {
    await chrome.storage.sync.set({ prompt: value });
  }
  flash("Saved");
});

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.sync.remove("prompt");
  box.value = DEFAULT_PROMPT;
  flash("Reset");
});
