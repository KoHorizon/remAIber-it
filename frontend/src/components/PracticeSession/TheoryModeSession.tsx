import type { Session } from "../../types";
import { Button } from "../ui";

type AnsweredQuestion = {
  index: number;
  answer: string;
  skipped: boolean;
};

type Props = {
  session: Session;
  currentQuestion: { id: string; subject: string };
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  currentBankSubject: string;
  answer: string;
  timeRemaining: number | null;
  isSubmitting: boolean;
  isLastQuestion: boolean;
  answeredQuestions: AnsweredQuestion[];
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  formatTime: (seconds: number) => string;
};

export function TheoryModeSession({
  session,
  currentQuestion,
  currentIndex,
  totalQuestions,
  progress,
  currentBankSubject,
  answer,
  timeRemaining,
  isSubmitting,
  isLastQuestion,
  answeredQuestions,
  onAnswerChange,
  onSubmit,
  onSkip,
  onCancel,
  onKeyDown,
  formatTime,
}: Props) {
  const answered = answeredQuestions.filter((q) => !q.skipped).length;
  const skipped = answeredQuestions.filter((q) => q.skipped).length;

  return (
    <div className="ts-layout animate-fade-in">

      {/* Top bar */}
      <div className="ts-topbar">
        <div className="ts-topbar-left">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Exit
          </Button>
          <span className="ts-bank-name">{currentBankSubject}</span>
          {session.focus_on_weak && <span className="ts-badge">Focus mode</span>}
        </div>
        <div className="ts-topbar-center">
          <div className="ts-progress-track">
            <div className="ts-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="ts-progress-label">{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className="ts-topbar-right">
          {timeRemaining !== null && (
            <span className={`ts-timer ${timeRemaining <= 60 ? "ts-timer--warning" : ""} ${timeRemaining <= 10 ? "ts-timer--critical" : ""}`}>
              {formatTime(timeRemaining)}
            </span>
          )}
          <div className="ts-stats">
            <span className="ts-stat"><strong>{answered}</strong> answered</span>
            <span className="ts-stat-sep" />
            <span className="ts-stat"><strong>{skipped}</strong> skipped</span>
            <span className="ts-stat-sep" />
            <span className="ts-stat"><strong>{totalQuestions - currentIndex - 1}</strong> remaining</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="ts-body">

        {/* Question hero */}
        <div className="ts-hero">
          <span className="ts-question-eyebrow">Question {currentIndex + 1} of {totalQuestions}</span>
          <p className="ts-question-text">{currentQuestion.subject}</p>
        </div>

        {/* Answer area */}
        <div className="ts-answer-area">
          <label className="ts-answer-label">Your answer</label>
          <textarea
            className="ts-answer-textarea"
            placeholder="Write what you remember..."
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          />
        </div>

      </div>

      {/* Bottom action bar */}
      <div className="ts-actionbar">
        <span className="ts-hint">
          {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to submit
        </span>
        <div className="ts-actions">
          <Button variant="secondary" size="sm" onClick={onSkip} disabled={isSubmitting}>
            Skip
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={!answer.trim() || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : isLastQuestion ? "Finish" : "Next →"}
          </Button>
        </div>
      </div>

    </div>
  );
}
