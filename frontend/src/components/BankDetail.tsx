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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [gradingPrompt, setGradingPrompt] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
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

  async function handleDeleteQuestion(questionId: string) {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await api.deleteQuestion(bankId, questionId);
      // Refetch bank data to get updated mastery
      const updatedBank = await api.getBank(bankId);
      setBank(updatedBank);
    } catch (err) {
      console.error("Failed to delete question:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  }

  async function handleStartSession(config: {
    maxQuestions?: number;
    maxDurationMin?: number;
    focusOnWeak?: boolean;
  }) {
    if (!bank || isStartingSession) return;

    setIsStartingSession(true);
    setShowSessionConfig(false);

    try {
      const session = await api.createSession(bankId, {
        max_questions: config.maxQuestions,
        max_duration_min: config.maxDurationMin,
        focus_on_weak: config.focusOnWeak,
      });
      onStartPractice(session, bank.subject);
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStartingSession(false);
    }
  }

  function openGradingSettings() {
    setGradingPrompt(bank?.grading_prompt || "");
    setShowGradingSettings(true);
  }

  async function handleSaveGradingPrompt() {
    if (!bank || isSavingPrompt) return;

    setIsSavingPrompt(true);
    try {
      const trimmed = gradingPrompt.trim();
      await api.updateBankGradingPrompt(bankId, trimmed || null);
      setBank({ ...bank, grading_prompt: trimmed || null });
      setShowGradingSettings(false);
    } catch (err) {
      console.error("Failed to save grading prompt:", err);
    } finally {
      setIsSavingPrompt(false);
    }
  }

  function getCategoryName(): string | null {
    if (!bank?.category_id) return null;
    const category = categories.find((c) => c.id === bank.category_id);
    return category?.name || null;
  }

  function getMasteryColor(mastery: number): string {
    if (mastery >= 80) return "mastery-excellent";
    if (mastery >= 60) return "mastery-good";
    if (mastery >= 40) return "mastery-fair";
    if (mastery > 0) return "mastery-needs-work";
    return "mastery-none";
  }

  function getMasteryLabel(mastery: number): string {
    if (mastery >= 80) return "Mastered";
    if (mastery >= 60) return "Good";
    if (mastery >= 40) return "Learning";
    if (mastery > 0) return "Needs work";
    return "Not practiced";
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
          <div className="bank-meta">
            <span className="page-subtitle">
              {questions.length === 0
                ? "No questions yet"
                : `${questions.length} question${questions.length !== 1 ? "s" : ""}`}
            </span>
            <div
              className={`bank-mastery-badge ${getMasteryColor(bank.mastery)}`}
            >
              <span className="mastery-value">{bank.mastery}%</span>
              <span className="mastery-label">overall mastery</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={openGradingSettings}
            title="Grading Settings"
          >
            ⚙️ Grading
          </button>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="modal delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Delete Question</h2>
            <p>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDeleteQuestion(showDeleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grading Settings Modal */}
      {showGradingSettings && (
        <div
          className="modal-overlay"
          onClick={() => setShowGradingSettings(false)}
        >
          <div
            className="modal grading-settings-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Grading Settings</h2>
            <p className="grading-settings-description">
              Customize how answers are graded for this bank. Leave empty to use
              default concept-based grading.
            </p>

            <label className="input-label" htmlFor="grading-prompt">
              Custom Grading Rules
            </label>
            <textarea
              id="grading-prompt"
              className="input textarea grading-textarea"
              placeholder={`Example for CLI commands:

GRADING RULES:
1. EXACT SYNTAX required - command must match character-for-character
2. Flag order does not matter
3. Typos = wrong (e.g., "git comit" is wrong)
4. Missing flags = partial credit`}
              value={gradingPrompt}
              onChange={(e) => setGradingPrompt(e.target.value)}
              rows={12}
            />

            <div className="grading-templates">
              <span className="templates-label">Templates:</span>
              <button
                type="button"
                className="template-btn"
                onClick={() =>
                  setGradingPrompt(`GRADING RULES FOR CODE SYNTAX:

1. STRUCTURE over exact wording
   - The code pattern/structure must match the expected answer
   - Variable names can differ (user vs u, email vs e)
   - Formatting/whitespace doesn't matter

2. FUNCTIONALITY is key
   - The code must be syntactically valid for the language
   - The logic must achieve the same result as expected
   - Use your knowledge to verify the code would compile/run

3. KEY ELEMENTS to check:
   - Correct language constructs (struct, class, function, etc.)
   - Proper return types and error handling
   - Required validations/checks are present
   - Correct use of language idioms

4. PARTIAL CREDIT for:
   - Incomplete implementation
   - Minor syntax errors that show understanding
   - Not importing packages in the user answer is not wrong. Do not count this as missed.

5. WRONG if:
   - Completely different approach/pattern
   - Would not compile/run
   - Missing core functionality`)
                }
              >
                Code Syntax
              </button>
              <button
                type="button"
                className="template-btn"
                onClick={() =>
                  setGradingPrompt(`GRADING RULES:
1. EXACT SYNTAX required - command must match character-for-character
2. Flag order does not matter (e.g., "-a -m" = "-m -a")
3. Typos = wrong (e.g., "git comit" instead of "git commit")
4. Missing flags or arguments = partial credit
5. Extra unnecessary flags = still correct if core command is right`)
                }
              >
                CLI Commands
              </button>
              <button
                type="button"
                className="template-btn"
                onClick={() =>
                  setGradingPrompt(`GRADING RULES:
1. Keywords must match exactly (SELECT, FROM, WHERE, etc.)
2. Table and column names must be correct
3. Whitespace and formatting don't matter
4. Case insensitive for SQL keywords
5. Missing clauses = partial credit`)
                }
              >
                SQL Queries
              </button>
              <button
                type="button"
                className="template-btn"
                onClick={() =>
                  setGradingPrompt(`GRADING RULES:
1. Character-perfect match required
2. No partial credit - either correct or wrong
3. Escape sequences must be exact
4. Flags must be in correct position`)
                }
              >
                Regex / Exact Match
              </button>
              <button
                type="button"
                className="template-btn"
                onClick={() => setGradingPrompt("")}
              >
                Default (Concepts)
              </button>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowGradingSettings(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveGradingPrompt}
                disabled={isSavingPrompt}
              >
                {isSavingPrompt ? "Saving..." : "Save"}
              </button>
            </div>
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
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="question-card card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="question-header">
                <span className="question-number">Q{index + 1}</span>
                <div
                  className={`question-mastery ${getMasteryColor(q.mastery)}`}
                >
                  <span className="mastery-percent">{q.mastery}%</span>
                  <span className="mastery-status">
                    {getMasteryLabel(q.mastery)}
                  </span>
                </div>
              </div>
              <div className="question-content">
                <p className="question-subject">{q.subject}</p>
                {q.expected_answer && (
                  <p className="question-answer">{q.expected_answer}</p>
                )}
              </div>
              <div className="question-stats">
                <span className="stat">
                  <span className="stat-value">{q.times_answered}</span>
                  <span className="stat-label">attempts</span>
                </span>
                <span className="stat">
                  <span className="stat-value">{q.times_correct}</span>
                  <span className="stat-label">correct</span>
                </span>
                {q.times_answered > 0 && (
                  <span className="stat">
                    <span className="stat-value">
                      {Math.round((q.times_correct / q.times_answered) * 100)}%
                    </span>
                    <span className="stat-label">success rate</span>
                  </span>
                )}
              </div>
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(q.id);
                }}
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
