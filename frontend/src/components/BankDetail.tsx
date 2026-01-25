import { useState, useEffect } from "react";
import { api, Bank, Session, Category } from "../App";
import { SessionConfigModal } from "./SessionConfigModal";
import "./BankDetail.css";

type Props = {
  bankId: string;
  onBack: () => void;
  onStartPractice: (session: Session, bankSubject: string) => void;
};

export function BankDetail({ bankId, onBack, onStartPractice }: Props) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  useEffect(() => {
    loadData();
  }, [bankId]);

  async function loadData() {
    try {
      const [bankData, categoriesData] = await Promise.all([
        api.getBank(bankId),
        api.getCategories(),
      ]);
      setBank(bankData);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Failed to load data:", err);
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
              questions: prev.questions?.filter((q) => q.id !== questionId),
            }
          : null,
      );
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  }

  async function handleStartSession(config: {
    maxQuestions?: number;
    maxDurationMin?: number;
  }) {
    if (!bank || isStartingSession) return;

    setIsStartingSession(true);
    setShowSessionConfig(false);

    try {
      const session = await api.createSession(bankId, {
        max_questions: config.maxQuestions,
        max_duration_min: config.maxDurationMin,
      });
      onStartPractice(session, bank.subject);
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStartingSession(false);
    }
  }

  function getCategoryName(): string | null {
    if (!bank?.category_id) return null;
    const category = categories.find((c) => c.id === bank.category_id);
    return category?.name || null;
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
      <div className="bank-detail animate-fade-in">
        <p>Bank not found</p>
        <button className="btn btn-secondary" onClick={onBack}>
          Go Back
        </button>
      </div>
    );
  }

  const questions = bank.questions || [];
  const categoryName = getCategoryName();

  return (
    <div className="bank-detail animate-fade-in">
      <div className="page-header">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="bank-header-info">
          {categoryName && (
            <span className="bank-category">{categoryName}</span>
          )}
          <h1>{bank.subject}</h1>
          <p className="page-subtitle">
            {questions.length === 0
              ? "No questions yet"
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
            onClick={() => setShowSessionConfig(true)}
            disabled={questions.length === 0 || isStartingSession}
          >
            {isStartingSession ? "Starting..." : "Practice"}
          </button>
        </div>
      </div>

      {/* Session Config Modal */}
      {showSessionConfig && (
        <SessionConfigModal
          totalQuestions={questions.length}
          onStart={handleStartSession}
          onCancel={() => setShowSessionConfig(false)}
        />
      )}

      {/* Add Question Modal */}
      {showAddQuestion && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddQuestion(false)}
        >
          <div
            className="modal add-question-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add Question</h2>
            <form onSubmit={handleAddQuestion}>
              <label className="input-label" htmlFor="question">
                Question
              </label>
              <textarea
                id="question"
                className="input textarea"
                placeholder="Enter your question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={3}
                autoFocus
              />

              <label className="input-label" htmlFor="answer">
                Expected Answer
              </label>
              <textarea
                id="answer"
                className="input textarea"
                placeholder="Enter the expected answer with key points..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                rows={5}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
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

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <p className="empty-state-text">
            Add questions to this bank to start practicing.
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q) => (
            <div key={q.id} className="question-card">
              <div className="question-content">
                <p className="question-subject">{q.subject}</p>
                {q.expected_answer && (
                  <p className="question-answer">{q.expected_answer}</p>
                )}
              </div>
              <button
                className="btn btn-ghost delete-btn"
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
