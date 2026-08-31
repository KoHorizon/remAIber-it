import { useState } from "react";
import { api, type SimulateGradeResult } from "../../api";
import { useLibraryData } from "../../context";
import type { BankType } from "../../types";

/** How long the result card takes to slide away, per `SimulationView.css`. */
const CLOSE_ANIMATION_MS = 300;

type Params = {
  gradeResult: SimulateGradeResult | null;
  bankType: BankType;
  question: string;
  expectedAnswer: string;
  gradingPrompt: string;
  /** Run once the card has finished sliding away, to clear the bench. */
  onSaved: () => void;
};

/** Everything `useSaveToBank` returns, for components that take it whole. */
export type SaveToBank = ReturnType<typeof useSaveToBank>;

/**
 * Filing a graded question into a real bank: picking the destination, and the
 * slide-away that follows a successful save.
 */
export function useSaveToBank({
  gradeResult,
  bankType,
  question,
  expectedAnswer,
  gradingPrompt,
  onSaved,
}: Params) {
  const { categories, banks } = useLibraryData();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pickedBankId, setPickedBankId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosingResult, setIsClosingResult] = useState(false);

  /**
   * A null category is not "any category" — it's the banks that sit outside
   * every category, which is where the picker starts.
   */
  const matchingBanks = banks.filter(
    (b) =>
      b.bank_type === bankType &&
      (selectedCategoryId === null
        ? b.category_id === null || b.category_id === undefined
        : b.category_id === selectedCategoryId)
  );

  /**
   * Derived rather than reset by an effect: a pick only counts while it is
   * still on offer. Changing the category or the bank type re-filters the list,
   * and so does the bank being renamed away or deleted underneath us.
   */
  const selectedBankId = matchingBanks.some((b) => b.id === pickedBankId)
    ? pickedBankId
    : null;

  /**
   * Which result the save panel was opened from, rather than a bare boolean.
   * The panel is part of one specific score card, so a regrade or a cleared
   * result closes it by identity — no effect, and no chance of the panel
   * outliving the card it belongs to for a render.
   */
  const [saveViewFor, setSaveViewFor] = useState<SimulateGradeResult | null>(null);
  const isSaveViewOpen = gradeResult !== null && saveViewFor === gradeResult;

  const canSave = gradeResult !== null && selectedBankId !== null;

  async function save() {
    if (!canSave || isSaving || !selectedBankId) return;

    setIsSaving(true);
    try {
      await api.addQuestion(
        selectedBankId,
        question.trim(),
        expectedAnswer.trim(),
        gradingPrompt.trim() || null
      );
      setIsSaving(false);

      // Slide the card away first: clearing the inputs now would empty it on
      // screen mid-animation.
      setIsClosingResult(true);
      setTimeout(() => {
        setIsClosingResult(false);
        setSaveViewFor(null);
        onSaved();
      }, CLOSE_ANIMATION_MS);
    } catch (err) {
      console.error("Failed to save question:", err);
      setIsSaving(false);
    }
  }

  return {
    categories,
    matchingBanks,
    selectedCategoryId,
    selectedBankId,
    isSaving,
    isClosingResult,
    isSaveViewOpen,
    canSave,
    selectCategory: setSelectedCategoryId,
    selectBank: setPickedBankId,
    openSaveView: () => setSaveViewFor(gradeResult),
    closeSaveView: () => setSaveViewFor(null),
    save,
  };
}
