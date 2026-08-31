import { useState } from "react";
import { api, type SimulateGradeResult } from "../../api";
import type { BankType } from "../../types";
import { getDefaultRules } from "../../utils/gradingTemplates";

/** Everything `useSimulation` returns, for components that take it whole. */
export type Simulation = ReturnType<typeof useSimulation>;

/**
 * The question being tried out and the grade it came back with.
 *
 * The result and the inputs live in one hook because the result is only ever
 * true of the exact inputs that produced it. Every setter here clears it for
 * that reason — a score sitting above an edited answer describes text that is
 * no longer on screen. That used to be an effect keyed on all four fields,
 * which meant the clear happened a render *after* the edit and had to be
 * written without reading `gradeResult` at all, or arriving at a result would
 * immediately wipe it.
 */
export function useSimulation() {
  const [bankType, setBankTypeState] = useState<BankType>("theory");
  const [question, setQuestionState] = useState("");
  const [expectedAnswer, setExpectedAnswerState] = useState("");
  const [testAnswer, setTestAnswerState] = useState("");
  const [gradingPrompt, setGradingPromptState] = useState(() =>
    getDefaultRules("theory")
  );
  const [language, setLanguage] = useState<string | null>("javascript");
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<SimulateGradeResult | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  /**
   * Wraps a field setter so editing that field drops the stale result. The
   * error is left alone: it names why the last attempt failed, which is still
   * worth reading while you fix the input, and `grade` clears it on the way in.
   */
  function withResultCleared<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setGradeResult(null);
    };
  }

  const setQuestion = withResultCleared(setQuestionState);
  const setExpectedAnswer = withResultCleared(setExpectedAnswerState);
  const setTestAnswer = withResultCleared(setTestAnswerState);
  const setGradingPrompt = withResultCleared(setGradingPromptState);

  /**
   * Each type grades differently, so the rules go back to that type's defaults
   * — and any result from the old type describes a grading run that can't be
   * reproduced under the new one, so it goes too, error included.
   */
  function setBankType(next: BankType) {
    setBankTypeState(next);
    setGradingPromptState(getDefaultRules(next));
    setGradeResult(null);
    setGradeError(null);
  }

  const canGrade = Boolean(
    question.trim() && expectedAnswer.trim() && testAnswer.trim()
  );

  async function grade() {
    if (!canGrade || isGrading) return;

    setIsGrading(true);
    setGradeError(null);

    try {
      const result = await api.simulateGrade({
        question: question.trim(),
        expected_answer: expectedAnswer.trim(),
        user_answer: testAnswer.trim(),
        bank_type: bankType,
        // Empty means "use whatever the backend already has", which it reads
        // from null. An empty string would ask it to grade against no rules.
        grading_prompt: gradingPrompt.trim() || null,
      });
      setGradeResult(result);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Grading failed");
      setGradeResult(null);
    } finally {
      setIsGrading(false);
    }
  }

  /** Clears the bench back to a blank question of the current type. */
  function reset() {
    setQuestionState("");
    setExpectedAnswerState("");
    setTestAnswerState("");
    setGradingPromptState(getDefaultRules(bankType));
    setGradeResult(null);
    setGradeError(null);
    setIsRulesOpen(false);
  }

  return {
    bankType,
    question,
    expectedAnswer,
    testAnswer,
    gradingPrompt,
    language,
    isRulesOpen,
    isGrading,
    gradeResult,
    gradeError,
    canGrade,
    setBankType,
    setQuestion,
    setExpectedAnswer,
    setTestAnswer,
    setGradingPrompt,
    setLanguage,
    toggleRules: () => setIsRulesOpen((open) => !open),
    grade,
    reset,
  };
}
