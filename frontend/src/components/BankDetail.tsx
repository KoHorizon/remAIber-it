import { useState, useEffect } from "react";
import { api, Bank, Question, Session } from "../App";
import "./BankDetail.css";

type Props = {
  bankId: string;
  onBack: () => void;
  onStartPractice: (session: Session, bankSubject: string) => void;
};

export function BankDetail({ bankId, onBack, onStartPractice }: Props) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  useEffect(() => {
    loadBank();
  }, [bankId]);

  async function loadBank() {
    try {
      const data = await api.getBank(bankId);
      setBank(data);
    } catch (err) {
      console.error("Failed to load bank:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const question = await api.addQuestion(
        bankId,
        newQuestion.trim(),
        newAnswer.trim(),
      );
      setBank((prev) =>
        prev
          ? {
              ...prev,
              questions: [...(prev.questions || []), question],
            }
          : null,
      );
      setNewQuestion("");
      setNewAnswer("");
      setShowAddQuestion(false);
    } catch (err) {
      console.error("Failed to add question:", err);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteQuestion(e: React.MouseEvent, questionId: string) {
    e.stopPropagation();
    if (!confirm("Delete this question?")) return;

    try {
      await api.deleteQuestion(bankId, questionId);
      setBank((prev) =>
        prev
          ? {
              ...prev,
              questions: (prev.questions || []).filter(
                (q) => q.id !== questionId,
              ),
            }
          : null,
      );
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  }

  async function handleStartPractice() {
    if (!bank || isStartingSession) return;

    setIsStartingSession(true);
    try {
      const session = await api.createSession(bankId);
      onStartPractice(session, bank.subject);
    } catch (err) {
      console.error("Failed to start session:", err);
      setIsStartingSession(false);
    }
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="animate-fade-in">
        <button className="back-btn" onClick={onBack}>
          ← Back to Banks
        </button>
        <div className="empty-state">
          <p className="empty-state-text">Bank not found</p>
        </div>
      </div>
    );
  }

  const questions = bank.questions || [];

  return (
    <div className="bank-detail animate-fade-in">
      <button className="back-btn" onClick={onBack}>
        ← Back to Banks
      </button>

      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>{bank.subject}</h1>
            <p className="page-subtitle">
              {questions.length === 0
                ? "Add questions to start practicing"
                : `${questions.length} question${questions.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddQuestion(true)}
            >
              + Add Question
            </button>
            <button
              className="btn btn-primary"
              onClick={handleStartPractice}
              disabled={questions.length === 0 || isStartingSession}
            >
              {isStartingSession ? "Starting..." : "Start Practice"}
            </button>
          </div>
        </div>
      </div>

      {showAddQuestion && (
        <div
          className="create-modal-overlay"
          onClick={() => setShowAddQuestion(false)}
        >
          <div
            className="create-modal add-question-modal animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add Question</h2>
            <form onSubmit={handleAddQuestion}>
              <div className="input-group">
                <label className="input-label" htmlFor="question">
                  Question
                </label>
                <input
                  id="question"
                  type="text"
                  className="input"
                  placeholder="e.g., What is a closure?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="answer">
                  Expected Answer
                </label>
                <textarea
                  id="answer"
                  className="input textarea"
                  placeholder="The key concepts the answer should cover..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddQuestion(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    !newQuestion.trim() || !newAnswer.trim() || isAdding
                  }
                >
                  {isAdding ? "Adding..." : "Add Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <p className="empty-state-text">
            No questions yet. Add some to build your question bank.
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="question-card card"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="question-number">{i + 1}</div>
              <div className="question-content">
                <p className="question-text">{q.subject}</p>
                {q.expected_answer && (
                  <p className="question-answer">{q.expected_answer}</p>
                )}
              </div>
              <button
                className="btn-delete"
                onClick={(e) => handleDeleteQuestion(e, q.id)}
                title="Delete question"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
