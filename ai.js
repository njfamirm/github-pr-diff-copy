// Runs on Gemini / ChatGPT / Claude. If a diff is pending for this host, type the
// review prompt and attach the diff as a file, trying several methods and
// verifying that the file chip actually appeared. It never presses send.
(async () => {
  const { pendingDiff: p } = await chrome.storage.local.get("pendingDiff");
  if (!p || p.host !== location.hostname || Date.now() - p.ts > 60_000) return;
  await chrome.storage.local.remove("pendingDiff");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function toast(msg, isError) {
    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.textContent = msg;
    el.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;" +
      "padding:8px 14px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;color:#fff;" +
      `background:${isError ? "#d1242f" : "#1f2328"};box-shadow:0 4px 16px rgba(0,0,0,.35)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), isError ? 9000 : 4000);
  }

  const SELECTORS = [
    "#prompt-textarea", // ChatGPT
    "rich-textarea .ql-editor", // Gemini
    'div.ProseMirror[contenteditable="true"]', // Claude
    '[contenteditable="true"]',
    "textarea",
  ];
  const findInput = () => {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  };

  let input = null;
  for (let i = 0; i < 80 && !(input = findInput()); i++) await sleep(250);
  if (!input) return toast("PR Diff Copy: chat box not found. Diff is on your clipboard (Ctrl+V).", true);

  // Let the app finish hydrating: these UIs often re-render the composer after first paint.
  for (let i = 0; i < 40 && document.readyState !== "complete"; i++) await sleep(250);
  await sleep(2000);
  input = findInput() || input;

  input.focus();
  // Skip if a saved draft already contains the prompt (Gemini restores drafts).
  if (!(input.innerText || input.value || "").includes(p.prompt)) {
    document.execCommand("insertText", false, p.prompt);
  }
  await sleep(300);

  const file = new File([p.text], p.filename, { type: "text/plain" });
  const makeDt = () => {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt;
  };
  const attached = () => document.body.innerText.includes(p.filename);

  const methods = [
    // 1) the page's own hidden file input (ChatGPT, Claude). Skip image-only ones.
    () => {
      const fi = [...document.querySelectorAll('input[type="file"]')].find(
        (i) => !i.disabled && (i.accept === "" || /text|\*\/\*|\.diff/.test(i.accept))
      );
      if (!fi) return false;
      fi.files = makeDt().files;
      fi.dispatchEvent(new Event("input", { bubbles: true }));
      fi.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    // 2) simulated drop on the composer (Gemini needs the outer fieldset/form).
    () => {
      const target = input.closest("fieldset, form") || input.parentElement || input;
      const dt = makeDt();
      for (const type of ["dragenter", "dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
      }
      return true;
    },
    // 3) simulated paste of a file.
    () => {
      input.focus();
      input.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: makeDt(), bubbles: true, cancelable: true })
      );
      return true;
    },
  ];

  // Two rounds: if the page still wasn't ready the first time, wait and retry.
  for (let round = 0; round < 2; round++) {
    if (round) {
      await sleep(2500);
      input = findInput() || input;
    }
    for (const run of methods) {
      let ran = false;
      try {
        ran = run();
      } catch (e) {
        console.warn("[PR Diff Copy] attach method failed", e);
      }
      if (!ran) continue;
      for (let i = 0; i < 20 && !attached(); i++) await sleep(250);
      if (attached()) return toast("Diff attached. Review the prompt and press send.");
    }
  }
  toast("PR Diff Copy: couldn't attach automatically. Diff is on your clipboard, press Ctrl+V.", true);
})();
