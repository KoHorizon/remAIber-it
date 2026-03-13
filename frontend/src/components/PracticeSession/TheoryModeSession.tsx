import type { Session } from "../../types";

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
  return (
    <div className="theory-session animate-fade-in">
      {/* Sidebar with progress */}
      <aside className="theory-sidebar">
        <div className="theory-sidebar-header">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Exit
          </button>
        </div>

        <div className="theory-sidebar-content">
          <div className="theory-sidebar-section">
            <h3 className="theory-sidebar-title">{currentBankSubject}</h3>
            {session.focus_on_weak && (
              <span className="theory-badge">Focus mode</span>
            )}
          </div>

          <div className="theory-sidebar-section">
            <span className="theory-sidebar-label">Progress</span>
            <div className="theory-progress-bar">
              <div
                className="theory-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="theory-progress-count">
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>

          {timeRemaining !== null && (
            <div className="theory-sidebar-section">
              <span className="theory-sidebar-label">Time remaining</span>
              <span
                className={`theory-timer ${timeRemaining <= 60 ? "warning" : ""} ${timeRemaining <= 10 ? "critical" : ""}`}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          <div className="theory-sidebar-section">
            <span className="theory-sidebar-label">Session stats</span>
            <div className="theory-stats">
              <div className="theory-stat">
                <span className="theory-stat-value">
                  {answeredQuestions.filter((q) => !q.skipped).length}
                </span>
                <span className="theory-stat-label">Answered</span>
              </div>
              <div className="theory-stat">
                <span className="theory-stat-value">
                  {answeredQuestions.filter((q) => q.skipped).length}
                </span>
                <span className="theory-stat-label">Skipped</span>
              </div>
              <div className="theory-stat">
                <span className="theory-stat-value">
                  {totalQuestions - currentIndex - 1}
                </span>
                <span className="theory-stat-label">Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="theory-main">
        <div className="theory-top-section">
          <div className="theory-question">{currentQuestion.subject}</div>

          <div className="theory-answer-wrapper">
            <label className="theory-answer-label">Your answer</label>
            <textarea
              className="theory-textarea"
              placeholder="Write what you remember..."
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
            />
            <div className="theory-answer-footer">
              <span className="theory-hint">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to
                submit
              </span>
              <div className="theory-actions">
                <button
                  className="btn btn-secondary"
                  onClick={onSkip}
                  disabled={isSubmitting}
                >
                  Skip
                </button>
                <button
                  className="btn btn-primary"
                  onClick={onSubmit}
                  disabled={!answer.trim() || isSubmitting}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : isLastQuestion
                      ? "Finish"
                      : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section - answered recap */}
        {answeredQuestions.length > 0 && (
          <div className="theory-recap-section">
            <h4 className="theory-recap-title">Your answers this session</h4>
            <div className="theory-recap-list">
              {answeredQuestions.map((item, idx) => (
                <div
                  key={idx}
                  className={`theory-recap-item ${item.skipped ? "skipped" : ""}`}
                >
                  <span className="theory-recap-num">Q{item.index + 1}</span>
                  {item.skipped ? (
                    <span className="theory-recap-skipped">Skipped</span>
                  ) : (
                    <p className="theory-recap-answer">{item.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
