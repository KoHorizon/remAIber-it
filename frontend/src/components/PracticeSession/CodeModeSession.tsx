import type { Session, BankType } from "../../types";
import { Button } from "../ui";
import { renderFormattedText } from "../../utils/formatText";
import { CodeEditor } from "../CodeEditor";
import { TerminalEditor } from "../TerminalEditor";

type Props = {
  session: Session;
  currentQuestion: { id: string; subject: string; bank_subject?: string };
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  currentBankType: BankType;
  currentBankSubject: string;
  bankLanguage?: string | null;
  answer: string;
  timeRemaining: number | null;
  isSubmitting: boolean;
  isLastQuestion: boolean;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onCancel: () => void;
  formatTime: (seconds: number) => string;
};

export function CodeModeSession({
  session,
  currentQuestion,
  currentIndex,
  totalQuestions,
  progress,
  currentBankType,
  currentBankSubject,
  bankLanguage,
  answer,
  timeRemaining,
  isSubmitting,
  isLastQuestion,
  onAnswerChange,
  onSubmit,
  onSkip,
  onCancel,
  formatTime,
}: Props) {
  function getEditorLanguage(): string {
    if (currentBankType === "cli") return "shell";
    return bankLanguage || "plaintext";
  }

  return (
    <div className="practice-session practice-session-split animate-fade-in">
      {/* Header */}
      <div className="practice-header-split">
        <div className="practice-meta">
          <span className="practice-subject">{currentBankSubject}</span>
          <span className="practice-count">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          {session.focus_on_weak && (
            <span className="practice-mode">🎯 Focus on weak</span>
          )}
          {session.is_multi_bank && (
            <span className="practice-mode">📚 Multi-bank</span>
          )}
        </div>
        <div className="practice-header-right">
          {timeRemaining !== null && (
            <span
              className={`practice-timer ${timeRemaining <= 60 ? "timer-warning" : ""} ${timeRemaining <= 10 ? "timer-critical" : ""}`}
            >
              {formatTime(timeRemaining)}
            </span>
          )}
          <Button variant="ghost" onClick={onCancel}>
            Exit
          </Button>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Split Panel */}
      <div className="split-container" key={currentQuestion.id}>
        {/* Left Panel - Question */}
        <div className="split-panel split-panel-left">
          <div className="panel-header">
            <span className="panel-tab active">Description</span>
          </div>
          <div className="panel-content">
            <div className="question-content-split animate-slide-up">
              <div className="question-type-badge">
                {currentBankType === "code" ? "💻" : "⌨️"}{" "}
                {currentBankType.toUpperCase()}
                {currentBankType === "code" && bankLanguage && (
                  <span className="language-badge">{bankLanguage}</span>
                )}
              </div>
              <div className="question-text">
                {renderFormattedText(currentQuestion.subject)}
              </div>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div className="split-resizer" />

        {/* Right Panel - Code Editor or Terminal */}
        <div className="split-panel split-panel-right">
          <div className="panel-header">
            <span className="panel-tab active">
              {currentBankType === "code" ? "Code" : "Terminal"}
            </span>
          </div>
          <div className="panel-content panel-content-editor">
            {currentBankType === "cli" ? (
              <TerminalEditor
                value={answer}
                onChange={onAnswerChange}
                placeholder="Type your command..."
                height="100%"
              />
            ) : (
              <CodeEditor
                value={answer}
                onChange={onAnswerChange}
                language={getEditorLanguage()}
                height="100%"
                showThemeSelector
              />
            )}
          </div>
          <div className="panel-footer">
            <span className="submit-hint">Press ⌘+Enter to submit</span>
            <div className="panel-actions">
              <Button variant="secondary" onClick={onSkip} disabled={isSubmitting}>
                Skip
              </Button>
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={!answer.trim() || isSubmitting}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isLastQuestion
                    ? "Submit & See Results"
                    : "Submit & Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
