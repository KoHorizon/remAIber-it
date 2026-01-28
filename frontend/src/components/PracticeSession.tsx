import { useState, useEffect, useRef } from "react";
import { api, Session, SessionResult, BankType } from "../App";
import { CodeEditor } from "./CodeEditor";
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
  const completingRef = useRef(false);

  const questions = session.questions;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const isCodeMode = bankType === "code" || bankType === "cli";

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
    } catch (err) {
      console.error("Failed to complete session:", err);
      completingRef.current = false;
    }
  }

  async function handleSubmit() {
    if (!answer.trim() || isSubmitting || completingRef.current) return;

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
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    if (isSubmitting || completingRef.current) return;

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
    if (bankType === "cli") return "shell";
    return bankLanguage || "plaintext";
  }

  // Parse question text to support markdown-like formatting
  function renderQuestionContent(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="question-list">
            {listItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>,
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check for list items (- item or * item)
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.substring(2));
      } else if (trimmed === "") {
        flushList();
        // Add spacing for empty lines
        elements.push(
          <div key={`space-${index}`} className="question-spacer" />,
        );
      } else {
        flushList();
        // Check for code blocks (text wrapped in backticks)
        const parts = trimmed.split(/(`[^`]+`)/g);
        const formattedParts = parts.map((part, i) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code key={i} className="inline-code">
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        });
        elements.push(
          <p key={`p-${index}`} className="question-paragraph">
            {formattedParts}
          </p>,
        );
      }
    });

    flushList();
    return elements;
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
            <span className="practice-subject">{bankSubject}</span>
            <span className="practice-count">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {session.focus_on_weak && (
              <span className="practice-mode">🎯 Focus on weak</span>
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
                  {bankType === "code" ? "💻" : "⌨️"} {bankType.toUpperCase()}
                  {bankType === "code" && bankLanguage && (
                    <span className="language-badge">{bankLanguage}</span>
                  )}
                </div>
                <div className="question-text">
                  {renderQuestionContent(currentQuestion.subject)}
                </div>
              </div>
            </div>
          </div>

          {/* Resizer */}
          <div className="split-resizer" />

          {/* Right Panel - Code Editor */}
          <div className="split-panel split-panel-right">
            <div className="panel-header">
              <span className="panel-tab active">
                {bankType === "code" ? "Code" : "Terminal"}
              </span>
            </div>
            <div className="panel-content panel-content-editor">
              {bankType === "cli" ? (
                <div className="cli-editor-wrapper">
                  <CodeEditor
                    value={answer}
                    onChange={setAnswer}
                    language="shell"
                    height="100%"
                  />
                </div>
              ) : (
                <CodeEditor
                  value={answer}
                  onChange={setAnswer}
                  language={getEditorLanguage()}
                  height="100%"
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

  // Theory mode: Original vertical layout
  return (
    <div className="practice-session animate-fade-in">
      <div className="practice-header">
        <div className="practice-meta">
          <span className="practice-subject">{bankSubject}</span>
          <span className="practice-count">
            Question {currentIndex + 1} of {questions.length}
          </span>
          {session.focus_on_weak && (
            <span className="practice-mode">🎯 Focus on weak</span>
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

      <div className="practice-content">
        <div
          className="question-display animate-slide-up"
          key={currentQuestion.id}
        >
          <h2 className="question-prompt">{currentQuestion.subject}</h2>
        </div>

        <div className="answer-section">
          <label className="input-label" htmlFor="answer">
            Your Answer
          </label>
          <textarea
            id="answer"
            className="input textarea answer-input"
            placeholder="Write your answer from memory..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <p className="answer-hint">Press ⌘+Enter to submit</p>
        </div>

        <div className="practice-actions">
          <button
            className="btn btn-secondary"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </button>
          <button
            className="btn btn-primary btn-large"
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
  );
}
