import type { Session, SessionResult, BankType } from "../../types";
import { usePracticeSession } from "./usePracticeSession";
import { CompletingScreen } from "./CompletingScreen";
import { CodeModeSession } from "./CodeModeSession";
import { TheoryModeSession } from "./TheoryModeSession";
import "../PracticeSession.css";

type Props = {
  session: Session;
  bankSubject: string;
  bankType: BankType;
  bankLanguage?: string | null;
  onComplete: (results: SessionResult) => void;
  onCancel: () => void;
};

export function PracticeSession({
  session,
  bankSubject,
  bankType,
  bankLanguage,
  onComplete,
  onCancel,
}: Props) {
  const practice = usePracticeSession({
    session,
    bankType,
    onComplete,
  });

  // Get current bank subject for multi-bank sessions
  const currentBankSubject =
    session.is_multi_bank && practice.currentQuestion.bank_subject
      ? practice.currentQuestion.bank_subject
      : bankSubject;

  if (practice.isCompleting) {
    return <CompletingScreen />;
  }

  if (practice.isCodeMode) {
    return (
      <CodeModeSession
        session={session}
        currentQuestion={practice.currentQuestion}
        currentIndex={practice.currentIndex}
        totalQuestions={practice.questions.length}
        progress={practice.progress}
        currentBankType={practice.currentBankType}
        currentBankSubject={currentBankSubject}
        bankLanguage={bankLanguage}
        answer={practice.answer}
        timeRemaining={practice.timeRemaining}
        isSubmitting={practice.isSubmitting}
        isLastQuestion={practice.isLastQuestion}
        onAnswerChange={practice.setAnswer}
        onSubmit={practice.handleSubmit}
        onSkip={practice.handleSkip}
        onCancel={onCancel}
        formatTime={practice.formatTime}
      />
    );
  }

  return (
    <TheoryModeSession
      session={session}
      currentQuestion={practice.currentQuestion}
      currentIndex={practice.currentIndex}
      totalQuestions={practice.questions.length}
      progress={practice.progress}
      currentBankSubject={currentBankSubject}
      answer={practice.answer}
      timeRemaining={practice.timeRemaining}
      isSubmitting={practice.isSubmitting}
      isLastQuestion={practice.isLastQuestion}
      answeredQuestions={practice.answeredQuestions}
      onAnswerChange={practice.setAnswer}
      onSubmit={practice.handleSubmit}
      onSkip={practice.handleSkip}
      onCancel={onCancel}
      onKeyDown={practice.handleKeyDown}
      formatTime={practice.formatTime}
    />
  );
}
