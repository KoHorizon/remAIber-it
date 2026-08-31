import { useState } from "react";
import type { GeneratedQuestion } from "../../api";
import type { DraftField, DraftQuestion } from "./types";

/**
 * Everything `useQuestionDrafts` returns. The list component takes this whole
 * object as one prop: it needs all four pieces of state plus most of the
 * mutators, and threading them individually was fourteen props.
 */
export type QuestionDrafts = ReturnType<typeof useQuestionDrafts>;

/**
 * The draft questions and everything that mutates them: which one is open in
 * the editor, and the multi-select used for bulk delete.
 *
 * These three pieces of state are inseparable — every deletion has to reconcile
 * all of them, or the editor stays open on a question that no longer exists and
 * the selection keeps ids that aren't in the list. Keeping them in one hook is
 * what makes that reconciliation a single call rather than three at each site.
 */
export function useQuestionDrafts() {
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /** Adopts a fresh generation, discarding whatever was on screen. */
  function replaceAll(generated: GeneratedQuestion[]) {
    setQuestions(generated.map((q) => ({ ...q, id: crypto.randomUUID() })));
    setEditingId(null);
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function add() {
    const draft: DraftQuestion = {
      id: crypto.randomUUID(),
      subject: "",
      expected_answer: "",
      grading_prompt: null,
    };
    setQuestions((prev) => [...prev, draft]);
    setEditingId(draft.id);
  }

  function update(id: string, field: DraftField, value: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              // An empty grading prompt is null, not "": the API treats null as
              // "use the defaults" and "" as "grade with no rules at all".
              ...q,
              [field]: field === "grading_prompt" && !value ? null : value,
            }
          : q
      )
    );
  }

  function remove(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingId === id) setEditingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function clearAll() {
    setQuestions([]);
    setEditingId(null);
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  /** The editor is a toggle: clicking the open card closes it. */
  function toggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  function stopEditing() {
    setEditingId(null);
  }

  function enterSelectMode() {
    setSelectMode(true);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    setQuestions((prev) => prev.filter((q) => !selectedIds.has(q.id)));
    if (editingId && selectedIds.has(editingId)) setEditingId(null);
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  /**
   * Called after a save that failed part-way. Whatever reached the bank is
   * dropped — keeping it would mean a second Save writes it again as a
   * duplicate — and has to leave the selection too, which is keyed by the
   * same ids.
   */
  function keepUnsaved(remaining: DraftQuestion[], savedIds: Set<string>) {
    setQuestions(remaining);
    setSelectedIds((prev) => new Set([...prev].filter((id) => !savedIds.has(id))));
    if (editingId !== null && savedIds.has(editingId)) setEditingId(null);
  }

  /** Called after a save that wrote everything: nothing is left to act on. */
  function resetAfterSave() {
    setEditingId(null);
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  return {
    questions,
    editingId,
    selectMode,
    selectedIds,
    hasQuestions: questions.length > 0,
    replaceAll,
    add,
    update,
    remove,
    clearAll,
    toggleEdit,
    stopEditing,
    enterSelectMode,
    exitSelectMode,
    toggleSelect,
    deleteSelected,
    keepUnsaved,
    resetAfterSave,
  };
}
