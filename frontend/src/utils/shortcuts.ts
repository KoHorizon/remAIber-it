export type ShortcutAction = "submit" | "escape";

/** The subset of a keyboard event this matcher reads. */
export type ShortcutKey = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

/**
 * Maps a key press to one of the two view-level shortcuts every editor-style
 * view advertises: ⌘/Ctrl+Enter for the primary action, Escape to back out.
 *
 * Returns null for anything else, including Enter carrying extra modifiers —
 * ⌘⇧Enter and ⌥Enter are distinct gestures, and claiming them as plain submit
 * would swallow them silently if a view ever wants them.
 */
export function matchShortcut(e: ShortcutKey): ShortcutAction | null {
  if (e.shiftKey || e.altKey) return null;

  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) return "submit";
  if (e.key === "Escape" && !e.metaKey && !e.ctrlKey) return "escape";

  return null;
}
