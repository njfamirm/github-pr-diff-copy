// GitHub PR Diff Copy: content script for github.com (icons.js loads first).
const BAR_ID = "prdc-bar";
const PR_RE = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

function prInfo() {
  const m = location.pathname.match(PR_RE);
  if (!m) return null;
  const [, owner, repo, num] = m;
  return {
    url: `${location.origin}/${owner}/${repo}/pull/${num}.diff`,
    filename: `${repo}-pr-${num}.diff`,
  };
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback when user activation expired after the async fetch.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("Clipboard unavailable");
  }
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (res) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      res?.ok ? resolve(res) : reject(new Error(res?.error || "Request failed"));
    });
  });
}

const fetchDiff = (url) => send({ type: "fetch-diff", url }).then((r) => r.text);

function makeButton({ icon, tip, doneTip, brand, action, noFetch }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "prdc-btn";
  btn.setAttribute("aria-label", tip);
  btn.dataset.tip = tip;
  if (brand) btn.style.setProperty("--prdc-brand", brand);
  btn.appendChild(iconSvg(icon));

  let timer;
  const reset = () => {
    btn.removeAttribute("data-state");
    btn.dataset.tip = tip;
    btn.setAttribute("aria-label", tip);
    btn.replaceChildren(iconSvg(icon));
  };
  const finish = (state, glyph, message) => {
    btn.removeAttribute("aria-busy");
    btn.dataset.state = state;
    btn.dataset.tip = message;
    btn.setAttribute("aria-label", message);
    btn.replaceChildren(iconSvg(glyph));
    clearTimeout(timer);
    timer = setTimeout(reset, 2200);
  };

  btn.addEventListener("click", async () => {
    const info = prInfo();
    if (!info) return;
    clearTimeout(timer);
    btn.removeAttribute("data-state");
    btn.setAttribute("aria-busy", "true");
    try {
      const text = noFetch ? "" : await fetchDiff(info.url);
      await action(text, info);
      finish("ok", "check", doneTip);
    } catch (e) {
      finish("error", "x", e.message || "Something went wrong");
    }
  });
  return btn;
}

const AI_SITES = [
  { site: "gemini", name: "Gemini", brand: "#3186ff" },
  { site: "chatgpt", name: "ChatGPT", brand: "#10a37f" },
  { site: "claude", name: "Claude", brand: "#d97757" },
];

function buildBar() {
  const bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Pull request diff");

  const sep = () => Object.assign(document.createElement("span"), { className: "prdc-sep" });

  bar.append(
    makeButton({
      icon: "copy",
      tip: "Copy diff",
      doneTip: "Diff copied",
      action: (text) => writeClipboard(text),
    }),
    makeButton({
      icon: "download",
      tip: "Download .diff",
      doneTip: "Download started",
      action: (text, info) => downloadText(text, info.filename),
    }),
    sep(),
    ...AI_SITES.map(({ site, name, brand }) =>
      makeButton({
        icon: site,
        brand,
        tip: `Review in ${name}`,
        doneTip: `Opened ${name}`,
        action: async (text, info) => {
          // Also copy, so Ctrl+V works if auto-attach fails on the AI site.
          await writeClipboard(text).catch(() => {});
          await send({ type: "open-ai", site, text, filename: info.filename });
        },
      })
    ),
    sep(),
    makeButton({
      icon: "edit",
      tip: "Edit review prompt",
      doneTip: "Opened settings",
      noFetch: true,
      action: () => send({ type: "open-options" }),
    })
  );
  return bar;
}

// GitHub is a SPA (Turbo): re-check whenever the URL changes.
function sync() {
  const existing = document.getElementById(BAR_ID);
  const onPr = prInfo() !== null;
  if (onPr && !existing) document.body.appendChild(buildBar());
  else if (!onPr && existing) existing.remove();
}

sync();
document.addEventListener("turbo:render", sync);
document.addEventListener("turbo:load", sync);
window.addEventListener("popstate", sync);
setInterval(sync, 1000); // cheap safety net: no-op unless the URL changed
