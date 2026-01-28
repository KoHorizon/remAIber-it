import { useState, useEffect } from "react";
import { api, Bank, Session, Category, BankType } from "../App";
import { SessionConfigModal } from "./SessionConfigModal";
import { CodeEditor } from "./CodeEditor";
import { TerminalDisplay } from "./TerminalDisplay";
import { TerminalInput } from "./TerminalInput";
import "./BankDetail.css";

type Props = {
  bankId: string;
  onBack: () => void;
  onStartPractice: (
    session: Session,
    bankId: string,
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null,
  ) => void;
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
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(
    new Set(),
  );
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
      onStartPractice(
        session,
        bankId,
        bank.subject,
        bank.bank_type,
        bank.language,
      );
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

  // Render question text with formatting support
  function renderFormattedText(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="formatted-list">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineCode(item)}</li>
            ))}
          </ul>,
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.substring(2));
      } else if (trimmed === "") {
        flushList();
      } else {
        flushList();
        elements.push(
          <span key={`line-${index}`}>
            {renderInlineCode(trimmed)}
            {index < lines.length - 1 && <br />}
          </span>,
        );
      }
    });

    flushList();
    return elements;
  }

  function renderInlineCode(text: string) {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="inline-code">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
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
  const currentBank = bank;
  const isCodeMode = bank.bank_type === "code" || bank.bank_type === "cli";

  function getBankTypeBadge() {
    if (currentBank.bank_type === "code") {
      const langLabel = currentBank.language
        ? currentBank.language.charAt(0).toUpperCase() +
          currentBank.language.slice(1)
        : "Code";
      return { icon: "💻", label: langLabel, className: "badge-code" };
    }
    if (currentBank.bank_type === "cli") {
      return { icon: "⌨️", label: "CLI", className: "badge-cli" };
    }
    return { icon: "📝", label: "Theory", className: "badge-theory" };
  }

  const typeBadge = getBankTypeBadge();

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
            <span className={`bank-type-badge ${typeBadge.className}`}>
              <span className="badge-icon">{typeBadge.icon}</span>
              <span className="badge-label">{typeBadge.label}</span>
            </span>
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

      {/* Add Question Modal - Split Layout for Code Banks */}
      {showAddQuestion && isCodeMode && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddQuestion(false)}
        >
          <div
            className="modal add-question-modal-split"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-split">
              <h2>Add Question</h2>
              <button
                className="btn-close"
                onClick={() => setShowAddQuestion(false)}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleAddQuestion}
              className="add-question-form-split"
            >
              <div className="split-editor-container">
                {/* Left: Question/Description */}
                <div className="split-editor-panel">
                  <div className="split-editor-header">
                    <span className="split-editor-tab active">Description</span>
                  </div>
                  <div className="split-editor-content">
                    <div className="split-editor-hint">
                      <p>Write your question/task description. Supports:</p>
                      <ul>
                        <li>
                          <code>- item</code> for bullet lists
                        </li>
                        <li>
                          <code>`code`</code> for inline code
                        </li>
                        <li>Line breaks are preserved</li>
                      </ul>
                    </div>
                    <textarea
                      className="input textarea question-textarea"
                      placeholder={`Example:\nDefine sentinel errors for:\n- not found\n- unauthorized\n- invalid input\n\nThen write a \`GetUser\` function that uses them.`}
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Right: Expected Answer */}
                <div className="split-editor-panel">
                  <div className="split-editor-header">
                    <span className="split-editor-tab active">
                      Expected Answer
                    </span>
                  </div>
                  <div className="split-editor-content split-editor-content-code">
                    {bank.bank_type === "cli" ? (
                      <TerminalInput
                        value={newAnswer}
                        onChange={setNewAnswer}
                        placeholder="git commit -m 'message'"
                        height="100%"
                      />
                    ) : (
                      <CodeEditor
                        value={newAnswer}
                        onChange={setNewAnswer}
                        language={bank.language || "plaintext"}
                        height="100%"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions-split">
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

      {/* Add Question Modal - Original for Theory Banks */}
      {showAddQuestion && !isCodeMode && (
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

              <label className="input-label">Expected Answer</label>
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
              Customize how answers are graded for this bank.
              {bank.bank_type === "theory" &&
                " Default: concept-based grading."}
              {bank.bank_type === "code" && " Default: code syntax grading."}
              {bank.bank_type === "cli" && " Default: CLI command grading."}
            </p>

            <label className="input-label" htmlFor="grading-prompt">
              Custom Grading Rules
            </label>
            <textarea
              id="grading-prompt"
              className="input textarea grading-textarea"
              placeholder={
                bank.bank_type === "code"
                  ? "Custom rules for code syntax grading..."
                  : bank.bank_type === "cli"
                    ? "Custom rules for CLI command grading..."
                    : "Custom rules for concept grading..."
              }
              value={gradingPrompt}
              onChange={(e) => setGradingPrompt(e.target.value)}
              rows={12}
            />

            <div className="grading-templates">
              <span className="templates-label">Templates:</span>

              {bank.bank_type === "code" && (
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
   - Use the expected answer as the general basis.
   - Correct language constructs (struct, class, function, etc.)
   - Proper return types and error handling
   - Required validations/checks are present
   - Correct use of language idioms
   - If there is no import, don't count it as wrong

4. PARTIAL CREDIT for:
   - Incomplete implementation
   - Minor syntax errors that show understanding

5. WRONG if:
   - Completely different approach/pattern
   - Would not compile/run
   - Missing core functionality`)
                  }
                >
                  Code Syntax
                </button>
              )}

              {bank.bank_type === "cli" && (
                <button
                  type="button"
                  className="template-btn"
                  onClick={() =>
                    setGradingPrompt(`GRADING RULES FOR CLI COMMANDS:

1. EXACT SYNTAX required - command must match character-for-character
2. Flag order does not matter (e.g., "-a -m" = "-m -a")
3. Typos = wrong (e.g., "git comit" instead of "git commit")
4. Missing flags or arguments = partial credit
5. Extra unnecessary flags = still correct if core command is right`)
                  }
                >
                  CLI Commands
                </button>
              )}

              {bank.bank_type === "code" && bank.language === "sql" && (
                <button
                  type="button"
                  className="template-btn"
                  onClick={() =>
                    setGradingPrompt(`GRADING RULES FOR SQL:

1. Keywords must match exactly (SELECT, FROM, WHERE, etc.)
2. Table and column names must be correct
3. Whitespace and formatting don't matter
4. Case insensitive for SQL keywords
5. Missing clauses = partial credit`)
                  }
                >
                  SQL Queries
                </button>
              )}

              {(bank.bank_type === "code" || bank.bank_type === "cli") && (
                <button
                  type="button"
                  className="template-btn"
                  onClick={() =>
                    setGradingPrompt(`GRADING RULES FOR EXACT MATCH:

1. Character-perfect match required
2. No partial credit - either correct or wrong
3. Escape sequences must be exact
4. Flags must be in correct position`)
                  }
                >
                  Exact Match
                </button>
              )}

              {bank.bank_type === "theory" && (
                <button
                  type="button"
                  className="template-btn"
                  onClick={() => setGradingPrompt("")}
                >
                  Default (Concepts)
                </button>
              )}

              <button
                type="button"
                className="template-btn template-btn-clear"
                onClick={() => setGradingPrompt("")}
              >
                Clear
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
          {questions.map((q, index) => {
            const isExpanded = expandedAnswers.has(q.id);
            const isCodeBank =
              bank.bank_type === "code" || bank.bank_type === "cli";
            const lines = q.expected_answer?.split("\n") || [];
            const shouldCollapse = isCodeBank && lines.length > 15;
            const displayedAnswer =
              shouldCollapse && !isExpanded
                ? lines.slice(0, 15).join("\n") + "\n..."
                : q.expected_answer;

            return (
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
                  {isCodeMode ? (
                    <div className="question-subject-formatted">
                      {renderFormattedText(q.subject)}
                    </div>
                  ) : (
                    <p className="question-subject">{q.subject}</p>
                  )}
                  {q.expected_answer &&
                    (bank.bank_type === "cli" ? (
                      <div
                        className={`code-answer ${isExpanded ? "expanded" : ""}`}
                        onClick={() => {
                          if (shouldCollapse) {
                            setExpandedAnswers((prev) => {
                              const next = new Set(prev);
                              if (next.has(q.id)) {
                                next.delete(q.id);
                              } else {
                                next.add(q.id);
                              }
                              return next;
                            });
                          }
                        }}
                      >
                        <TerminalDisplay
                          value={q.expected_answer}
                          expanded={isExpanded || !shouldCollapse}
                          maxLines={15}
                        />
                        {shouldCollapse && (
                          <span className="code-expand-hint">
                            {isExpanded
                              ? "Click to collapse"
                              : `Click to expand (${lines.length} lines)`}
                          </span>
                        )}
                      </div>
                    ) : bank.bank_type === "code" ? (
                      <div
                        className={`code-answer ${isExpanded ? "expanded" : ""}`}
                        onClick={() => {
                          if (shouldCollapse) {
                            setExpandedAnswers((prev) => {
                              const next = new Set(prev);
                              if (next.has(q.id)) {
                                next.delete(q.id);
                              } else {
                                next.add(q.id);
                              }
                              return next;
                            });
                          }
                        }}
                      >
                        <CodeEditor
                          value={displayedAnswer || ""}
                          onChange={() => {}}
                          language={bank.language || "plaintext"}
                          height={
                            shouldCollapse && !isExpanded
                              ? "350px"
                              : `${lines.length * 22 + 24}px`
                          }
                          readOnly={true}
                        />
                        {shouldCollapse && (
                          <span className="code-expand-hint">
                            {isExpanded
                              ? "Click to collapse"
                              : `Click to expand (${lines.length} lines)`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="question-answer">{q.expected_answer}</p>
                    ))}
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
                        {Math.round((q.times_correct / q.times_answered) * 100)}
                        %
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
            );
          })}
        </div>
      )}
    </div>
  );
}
