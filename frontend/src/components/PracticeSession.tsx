import { useState } from "react";
import { api, Session, SessionResult } from "../App";
import "./PracticeSession.css";

type Props = {
  session: Session;
  bankSubject: string;
  onComplete: (results: SessionResult) => void;
  onCancel: () => void;
};

export function PracticeSession({
  session,
  bankSubject,
  onComplete,
  onCancel,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const questions = session.questions;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  async function handleSubmit() {
    if (!answer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.submitAnswer(session.id, currentQuestion.id, answer.trim());

      if (isLastQuestion) {
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.metaKey) {
      handleSubmit();
    }
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

  return (
    <div className="practice-session animate-fade-in">
      <div className="practice-header">
        <div className="practice-meta">
          <span className="practice-subject">{bankSubject}</span>
          <span className="practice-count">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <button className="btn btn-ghost" onClick={onCancel}>
          Exit
        </button>
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
