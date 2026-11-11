# Privacy

PR Diff Copy does not collect, store or transmit any data to the developer or
any third party.

- The diff is fetched from GitHub (`<pull request URL>.diff`) using your
  existing GitHub session, only when you click a button.
- "Copy" and "Download" keep the diff on your device.
- "Review in Gemini / ChatGPT / Claude" opens that site in a new tab and attaches
  the diff there. The diff is held in `chrome.storage.local` for up to
  60 seconds so the new tab can read it, then deleted. After that, the AI
  service's own privacy policy applies. Nothing is sent until you press send.
- No analytics, no tracking, no remote code.
