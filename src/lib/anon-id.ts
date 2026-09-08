// Per-browser anonymous identity for community-ranking dedup. Random UUID,
// created on first use, stored in localStorage. This is deliberately soft: it
// identifies a browser, never a person, and clearing site data resets it. Its
// job is to collapse casual anonymous replays into one community-ranking
// voice — determined evasion is handled by other layers (per-IP submission
// cap, identical-blob collapse at aggregation time).
const KEY = "sortr-anon-id";

export function getAnonId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode / blocked storage — submit without an id (counts as a
    // legacy anonymous ranking).
    return null;
  }
}
