import { useEffect, useRef } from "react";
import { matchShortcut } from "../utils/shortcuts";

type Options = {
  /** ⌘/Ctrl+Enter — the view's primary action. */
  onSubmit?: () => void;
  /** Escape — back out, cancel, or close whatever is open. */
  onEscape?: () => void;
  /**
   * Set false while a modal is open. `Modal` renders inline and handles no keys
   * of its own, so an un-gated Escape would navigate the whole view away and
   * leave the modal orphaned.
   */
  enabled?: boolean;
};

/**
 * Registers a view's ⌘/Ctrl+Enter and Escape shortcuts on the document.
 *
 * These used to hang off `onKeyDown` on the view's root `<div>`, which a plain
 * div can't receive unless focus is already on a descendant — so the advertised
 * "⌘+Enter to generate" hint did nothing until you clicked into a field, and
 * Escape couldn't back you out of a view you hadn't typed in. Listening on the
 * document is strictly more coverage: bubbled key presses from inside the view
 * still arrive exactly as before, plus presses that land on `<body>`.
 */
export function useViewShortcuts({ onSubmit, onEscape, enabled = true }: Options) {
  // Held in a ref so a re-rendered handler doesn't tear down the listener.
  const handlers = useRef({ onSubmit, onEscape });
  handlers.current = { onSubmit, onEscape };

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const action = matchShortcut(e);
      if (action === null) return;

      const handler =
        action === "submit"
          ? handlers.current.onSubmit
          : handlers.current.onEscape;
      if (!handler) return;

      e.preventDefault();
      handler();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
