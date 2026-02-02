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

// ---------------------------------------------------------------------------
// Grading rule templates
//
// These replace ONLY the "RULES:" block in the backend prompt. The backend
// handles everything else: splitting expected answers into numbered key points,
// asking the model to classify each as COVERED/MISSED, and parsing the JSON.
//
// Keep these SHORT (3-6 lines). Small local models (4-8B) lose track of long
// instruction blocks. Focus on judgment criteria, not on output format or
// decomposition — the backend owns that.
// ---------------------------------------------------------------------------

const DEFAULT_GRADING_RULES: Record<string, string> = {
  theory: `- Accept synonyms and different wording if the core concept is correct
- Practical examples that demonstrate understanding count as COVERED
- Vague or technically incorrect statements = MISSED
- The user doesn't need to match the exact terminology`,

  code: `- Compare logic and structure, not variable names or formatting
- Functionally equivalent approaches are equally correct
- Minor syntax errors that don't affect core logic = COVERED
- Code that wouldn't compile or produces wrong results = MISSED
- Don't penalize missing imports unless critical to the logic`,

  cli: `- Accept alternative commands that achieve the same goal
- Flag order doesn't matter
- Modern and legacy syntax both acceptable (e.g. git switch = git checkout)
- Extra harmless flags are fine
- Dangerous flags (--force, --hard) must match exactly when specified`,
};

// Optional specialized templates users can pick from
const EXTRA_TEMPLATES: Record<
  string,
  { label: string; rules: string; bankTypes: string[] }
> = {
  strict_theory: {
    label: "Strict (exact concepts)",
    bankTypes: ["theory"],
    rules: `- Require the correct technical term, not just a vague description
- Partial answers that miss the core mechanism = MISSED
- No credit for analogies without the actual concept`,
  },
  lenient_theory: {
    label: "Lenient (understanding)",
    bankTypes: ["theory"],
    rules: `- Accept any phrasing that shows the user understands the concept
- Analogies and real-world examples count as COVERED
- Partial understanding = COVERED if the core idea is present
- Only mark MISSED if completely wrong or absent`,
  },
  exact_match: {
    label: "Exact match",
    bankTypes: ["code", "cli"],
    rules: `- Require near-exact match with the expected answer
- Variable names and structure must match closely
- No partial credit — either correct or wrong
- Whitespace and formatting differences are acceptable`,
  },
  sql: {
    label: "SQL queries",
    bankTypes: ["code"],
    rules: `- SQL keywords are case-insensitive (SELECT = select)
- Table and column names must be correct
- Whitespace and formatting don't matter
- Functionally equivalent queries are acceptable (subquery vs JOIN)
- Missing clauses that change the result = MISSED`,
  },
  conceptual_code: {
    label: "Conceptual (logic only)",
    bankTypes: ["code"],
    rules: `- Only check if the algorithmic approach is correct
- Ignore all syntax details, variable names, and formatting
- Pseudocode-level correctness is sufficient
- Focus on data flow and control flow, not language specifics`,
  },
};

function getDefaultRules(bankType: string): string {
  return DEFAULT_GRADING_RULES[bankType] || DEFAULT_GRADING_RULES.theory;
}

function getAvailableTemplates(bankType: string) {
  return Object.entries(EXTRA_TEMPLATES).filter(([, t]) =>
    t.bankTypes.includes(bankType),
  );
}

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
    if (bank?.grading_prompt) {
      setGradingPrompt(bank.grading_prompt);
    } else {
      setGradingPrompt(getDefaultRules(bank?.bank_type || "theory"));
    }
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
  const bankType = bank.bank_type || "theory";
  const extraTemplates = getAvailableTemplates(bankType);

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
            <h2>Grading Rules</h2>
            <p className="grading-settings-description">
              These rules tell the AI how to judge whether your answer covers
              each key point. The system automatically splits expected answers
              into checkpoints — you only control the matching criteria here.
              Keep it short for best results with local models.
            </p>

            <label className="input-label" htmlFor="grading-prompt">
              Matching rules
              <span className="input-hint">
                {" "}
                — each line should start with <code>-</code>
              </span>
            </label>
            <textarea
              id="grading-prompt"
              className="input textarea grading-textarea"
              placeholder={`- Accept synonyms if the core concept is correct\n- Minor errors that don't affect the result = COVERED\n- Completely wrong or missing = MISSED`}
              value={gradingPrompt}
              onChange={(e) => setGradingPrompt(e.target.value)}
              rows={8}
            />

            <div className="grading-templates">
              <span className="templates-label">Presets:</span>

              <button
                type="button"
                className={`template-btn ${
                  gradingPrompt === getDefaultRules(bankType)
                    ? "template-btn-active"
                    : ""
                }`}
                onClick={() => setGradingPrompt(getDefaultRules(bankType))}
              >
                Default
                {bankType === "theory" && " (concepts)"}
                {bankType === "code" && " (code)"}
                {bankType === "cli" && " (CLI)"}
              </button>

              {extraTemplates.map(([key, template]) => (
                <button
                  key={key}
                  type="button"
                  className={`template-btn ${
                    gradingPrompt === template.rules
                      ? "template-btn-active"
                      : ""
                  }`}
                  onClick={() => setGradingPrompt(template.rules)}
                >
                  {template.label}
                </button>
              ))}

              <button
                type="button"
                className="template-btn template-btn-clear"
                onClick={() => setGradingPrompt("")}
              >
                Clear (use built-in)
              </button>
            </div>

            <details className="grading-help">
              <summary>How grading works</summary>
              <div className="grading-help-content">
                <p>When you submit an answer, the system:</p>
                <ol>
                  <li>Splits the expected answer into numbered key points</li>
                  <li>Sends each point + your answer to the local AI</li>
                  <li>
                    The AI classifies each point as <strong>COVERED</strong> or{" "}
                    <strong>MISSED</strong> based on these rules
                  </li>
                  <li>Your score = percentage of points covered</li>
                </ol>
                <p>
                  <strong>Tip:</strong> If grading feels too strict or too
                  lenient, try a different preset or write your own rules.
                  Shorter rules work better with small local models.
                </p>
              </div>
            </details>

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
