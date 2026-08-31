import { useState } from "react";
import type { ContentItem } from "./types";

/**
 * Separator between blocks in the generated prompt, so the model can tell where
 * one source ends and the next begins.
 */
const BLOCK_SEPARATOR = "\n\n---\n\n";

/**
 * The study material blocks and the modal that adds or edits one. The modal
 * state lives here rather than in the view because "which item is open" and
 * "what has been typed" only mean anything relative to the list.
 */
export function useStudyMaterial() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  /** Opens the editor on `item`, or blank to add a new block. */
  function openEditor(item?: ContentItem) {
    setDraft(item?.text ?? "");
    setEditingId(item?.id ?? null);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setDraft("");
    setEditingId(null);
  }

  function saveDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (editingId !== null) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...item, text: trimmed } : item
        )
      );
    } else {
      setItems((prev) => [...prev, { id: crypto.randomUUID(), text: trimmed }]);
    }
    closeEditor();
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return {
    items,
    combinedContent: items.map((item) => item.text).join(BLOCK_SEPARATOR),
    isEditorOpen,
    draft,
    editingId,
    setDraft,
    openEditor,
    closeEditor,
    saveDraft,
    remove,
  };
}
