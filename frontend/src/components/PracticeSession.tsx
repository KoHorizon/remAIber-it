import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import type { Session, SessionResult, BankType } from "../types";
import { renderFormattedText } from "../utils/formatText";
import { CodeEditor } from "./CodeEditor";
import { TerminalInput } from "./TerminalInput";
import "./PracticeSession.css";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    session.max_duration_min ? session.max_duration_min * 60 : null,
  );
  const [answeredQuestions, setAnsweredQuestions] = useState<Array<{index: number, answer: string, skipped: boolean}>>([]);
  const completingRef = useRef(false);

  const questions = session.questions;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // For multi-bank sessions, get the current question's bank type
  const currentBankType = session.is_multi_bank && currentQuestion.bank_type
    ? currentQuestion.bank_type as BankType
    : bankType;
  const currentBankSubject = session.is_multi_bank && currentQuestion.bank_subject
    ? currentQuestion.bank_subject
    : bankSubject;

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

    setAnsweredQuestions(prev => [...prev, { index: currentIndex, answer: answer.trim(), skipped: false }]);
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

    setAnsweredQuestions(prev => [...prev, { index: currentIndex, answer: "", skipped: true }]);

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

  function getEditorLanguage(): string {
    if (currentBankType === "cli") return "shell";
    return bankLanguage || "plaintext";
  }


  if (isCompleting) {
    return (
      <div className="practice-completing animate-fade-in">
        <div className="completing-content">
          <div className="spinner" />
          <p>Grading your answers...</p>
        </div>
      </div>
    );
  }

  // Code/CLI mode: Split layout like LeetCode
  if (isCodeMode) {
    return (
      <div className="practice-session practice-session-split animate-fade-in">
        {/* Header */}
        <div className="practice-header-split">
          <div className="practice-meta">
            <span className="practice-subject">{currentBankSubject}</span>
            <span className="practice-count">
              Question {currentIndex + 1} of {questions.length}
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
            <button className="btn btn-ghost" onClick={onCancel}>
              Exit
            </button>
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
                  {currentBankType === "code" ? "💻" : "⌨️"} {currentBankType.toUpperCase()}
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
                <TerminalInput
                  value={answer}
                  onChange={setAnswer}
                  placeholder="Type your command..."
                  height="100%"
                />
              ) : (
                <CodeEditor
                  value={answer}
                  onChange={setAnswer}
                  language={getEditorLanguage()}
                  height="100%"
                  showThemeSelector
                />
              )}
            </div>
            <div className="panel-footer">
              <span className="submit-hint">Press ⌘+Enter to submit</span>
              <div className="panel-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                >
                  Skip
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitting}
                >
                  {isSubmitting
                    ? "Submitting..."
                    : isLastQuestion
                      ? "Submit & See Results"
                      : "Submit & Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Theory mode: Full-width layout with sidebar
  return (
    <div className="theory-session animate-fade-in">
      {/* Sidebar with progress */}
      <aside className="theory-sidebar">
        <div className="theory-sidebar-header">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Exit
          </button>
        </div>

        <div className="theory-sidebar-content">
          <div className="theory-sidebar-section">
            <h3 className="theory-sidebar-title">{currentBankSubject}</h3>
            {session.focus_on_weak && <span className="theory-badge">Focus mode</span>}
          </div>

          <div className="theory-sidebar-section">
            <span className="theory-sidebar-label">Progress</span>
            <div className="theory-progress-bar">
              <div className="theory-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="theory-progress-count">{currentIndex + 1} / {questions.length}</span>
          </div>

          {timeRemaining !== null && (
            <div className="theory-sidebar-section">
              <span className="theory-sidebar-label">Time remaining</span>
              <span className={`theory-timer ${timeRemaining <= 60 ? "warning" : ""} ${timeRemaining <= 10 ? "critical" : ""}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          <div className="theory-sidebar-section">
            <span className="theory-sidebar-label">Session stats</span>
            <div className="theory-stats">
              <div className="theory-stat">
                <span className="theory-stat-value">{answeredQuestions.filter(q => !q.skipped).length}</span>
                <span className="theory-stat-label">Answered</span>
              </div>
              <div className="theory-stat">
                <span className="theory-stat-value">{answeredQuestions.filter(q => q.skipped).length}</span>
                <span className="theory-stat-label">Skipped</span>
              </div>
              <div className="theory-stat">
                <span className="theory-stat-value">{questions.length - currentIndex - 1}</span>
                <span className="theory-stat-label">Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="theory-main">
        <div className="theory-top-section">
          <div className="theory-question">
            {currentQuestion.subject}
          </div>

          <div className="theory-answer-wrapper">
            <label className="theory-answer-label">Your answer</label>
            <textarea
              className="theory-textarea"
              placeholder="Write what you remember..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="theory-answer-footer">
              <span className="theory-hint">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to submit
              </span>
              <div className="theory-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                >
                  Skip
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={!answer.trim() || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : isLastQuestion ? "Finish" : "Next"}
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
                <div key={idx} className={`theory-recap-item ${item.skipped ? 'skipped' : ''}`}>
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
