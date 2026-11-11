export const DEFAULT_PROMPT =
  "Please review this pull request diff (attached). Point out bugs, risks, " +
  "missing edge cases and suggested improvements, ordered by severity.";

export async function getPrompt() {
  try {
    const { prompt } = await chrome.storage.sync.get("prompt");
    return typeof prompt === "string" && prompt.trim() ? prompt : DEFAULT_PROMPT;
  } catch {
    return DEFAULT_PROMPT;
  }
}
