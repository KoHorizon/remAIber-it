import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import type { Session, SessionResult, BankType } from "../../types";

type AnsweredQuestion = {
  index: number;
  answer: string;
  skipped: boolean;
};

type UsePracticeSessionProps = {
  session: Session;
  bankType: BankType;
  onComplete: (results: SessionResult) => void;
};

export function usePracticeSession({
  session,
  bankType,
  onComplete,
}: UsePracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    session.max_duration_min ? session.max_duration_min * 60 : null
  );
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const completingRef = useRef(false);

  const questions = session.questions;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // For multi-bank sessions, get the current question's bank type
  const currentBankType =
    session.is_multi_bank && currentQuestion.bank_type
      ? (currentQuestion.bank_type as BankType)
      : bankType;

  const isCodeMode = currentBankType === "code" || currentBankType === "cli";

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (!completingRef.current) {
            handleTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  async function handleTimeUp() {
    if (completingRef.current) return;
    completingRef.current = true;
    setIsCompleting(true);

    try {
      if (answer.trim()) {
        await api.submitAnswer(session.id, currentQuestion.id, answer.trim());
      }
      const results = await api.completeSession(session.id);
      onComplete(results);
    } catch (err: unknown) {
      console.error("Failed to complete session:", err);
      completingRef.current = false;
    }
  }

  async function handleSubmit() {
    if (!answer.trim() || isSubmitting || completingRef.current) return;

    setAnsweredQuestions((prev) => [
      ...prev,
      { index: currentIndex, answer: answer.trim(), skipped: false },
    ]);
    setIsSubmitting(true);
    try {
      await api.submitAnswer(session.id, currentQuestion.id, answer.trim());

      if (isLastQuestion) {
        completingRef.current = true;
        setIsCompleting(true);
        const results = await api.completeSession(session.id);
        onComplete(results);
      } else {
        setAnswer("");
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err: unknown) {
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    if (isSubmitting || completingRef.current) return;

    setAnsweredQuestions((prev) => [
      ...prev,
      { index: currentIndex, answer: "", skipped: true },
    ]);

    if (isLastQuestion) {
      completingRef.current = true;
      setIsCompleting(true);
      const results = await api.completeSession(session.id);
      onComplete(results);
    } else {
      setAnswer("");
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.metaKey) {
      handleSubmit();
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return {
    // State
    currentIndex,
    answer,
    setAnswer,
    isSubmitting,
    isCompleting,
    timeRemaining,
    answeredQuestions,

    // Computed
    questions,
    currentQuestion,
    isLastQuestion,
    progress,
    currentBankType,
    isCodeMode,

    // Actions
    handleSubmit,
    handleSkip,
    handleKeyDown,
    formatTime,
  };
}
