import { getPrompt } from "./defaults.js";

const SITES = {
  gemini: { url: "https://gemini.google.com/app", host: "gemini.google.com" },
  chatgpt: { url: "https://chatgpt.com/", host: "chatgpt.com" },
  claude: { url: "https://claude.ai/new", host: "claude.ai" },
};

// Fetch happens here (host_permissions) so redirects to
// patch-diff.githubusercontent.com are not blocked by CORS.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "fetch-diff") {
    fetch(msg.url, { credentials: "include", redirect: "follow" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GitHub returned HTTP ${res.status}`);
        sendResponse({ ok: true, text: await res.text() });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true; // async response
  }

  if (msg?.type === "open-ai") {
    const site = SITES[msg.site];
    if (!site) return;
    getPrompt()
      .then((prompt) =>
        chrome.storage.local.set({
          pendingDiff: {
            host: site.host,
            text: msg.text,
            filename: msg.filename,
            prompt,
            ts: Date.now(),
          },
        })
      )
      .then(() => chrome.tabs.create({ url: site.url }))
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg?.type === "open-options") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
});
