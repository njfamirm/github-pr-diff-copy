# PR Diff Copy for GitHub

A small toolbar on every GitHub pull request page (bottom-right):

| Button | Action |
| --- | --- |
| Copy | Fetches `<PR url>.diff` and copies it to the clipboard |
| Download | Saves it as `<repo>-pr-<number>.diff` |
| Gemini / ChatGPT / Claude | Opens the site, attaches the diff as a file and types a review prompt. You press send. |

Works on private repos too, because it uses your logged-in GitHub session.
The toolbar follows GitHub's light/dark theme.

## Install (unpacked)

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Notes

- The review prompt is in `background.js` (`PROMPT`).
- Attaching works by driving each site's own upload input or drop zone, so a
  redesign of those sites can break it. The diff is also copied to your
  clipboard as a fallback (Ctrl+V).
- Very large diffs may exceed the AI site's file size limit.
- See [PRIVACY.md](PRIVACY.md). Brand icons are from
  [Simple Icons](https://simpleicons.org) (CC0); UI icons are GitHub Octicons (MIT).
  Gemini, ChatGPT and Claude are trademarks of their respective owners.
