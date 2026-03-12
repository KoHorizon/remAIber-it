import { useState, useEffect } from "react";
import { api } from "../api";
import type { Bank, Session, Category, BankType } from "../types";
import { getMasteryColor, getMasteryLabel, getBankTypeBadge } from "../utils/mastery";
import { renderFormattedText } from "../utils/formatText";
import { SessionConfigModal, GradingSettingsModal } from "./modals";
import { CodeEditor } from "./CodeEditor";
import { TerminalDisplay } from "./TerminalDisplay";
import "./BankDetail.css";

type Props = {
  bankId: string;
  onBack: () => void;
  onAddQuestion: (
    bankId: string,
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null
  ) => void;
  onStartPractice: (
    session: Session,
    bankId: string,
    bankSubject: string,
    bankType: BankType,
    bankLanguage?: string | null
  ) => void;
};

export function BankDetail({ bankId, onBack, onAddQuestion, onStartPractice }: Props) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
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
    } catch (err: unknown) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await api.deleteQuestion(bankId, questionId);
      const updatedBank = await api.getBank(bankId);
      setBank(updatedBank);
    } catch (err: unknown) {
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
      onStartPractice(session, bankId, bank.subject, bank.bank_type, bank.language);
    } catch (err: unknown) {
      console.error("Failed to start session:", err);
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleSaveGradingPrompt(prompt: string | null) {
    if (!bank) return;
    await api.updateBankGradingPrompt(bankId, prompt);
    setBank({ ...bank, grading_prompt: prompt });
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
  const isCodeMode = bank.bank_type === "code" || bank.bank_type === "cli";
  const typeBadge = getBankTypeBadge(bank);

  return (
    <div className="bank-detail animate-fade-in">
      <div className="page-header">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          &larr; Back
        </button>
        <div className="bank-header-info">
          {categoryName && <span className="bank-category">{categoryName}</span>}
          <h1>{bank.subject}</h1>
          <div className="bank-meta">
            <span className="page-subtitle">
              {questions.length === 0
                ? "No questions yet"
                : `${questions.length} question${questions.length !== 1 ? "s" : ""}`}
            </span>
            <div className={`bank-mastery-badge ${getMasteryColor(bank.mastery)}`}>
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
            onClick={() => setShowGradingSettings(true)}
            title="Grading Settings"
          >
            Grading
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onAddQuestion(bankId, bank.subject, bank.bank_type, bank.language)}
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

      {/* Modals */}
      {showSessionConfig && (
        <SessionConfigModal
          totalQuestions={questions.length}
          onStart={handleStartSession}
          onCancel={() => setShowSessionConfig(false)}
        />
      )}

      {showGradingSettings && (
        <GradingSettingsModal
          bankType={bank.bank_type}
          currentPrompt={bank.grading_prompt || null}
          onClose={() => setShowGradingSettings(false)}
          onSave={handleSaveGradingPrompt}
        />
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

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">?</div>
          <p className="empty-state-text">
            Add questions to this bank to start practicing.
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q, index) => {
            const isExpanded = expandedAnswers.has(q.id);
            const isCodeBank = bank.bank_type === "code" || bank.bank_type === "cli";
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
                  <div className={`question-mastery ${getMasteryColor(q.mastery)}`}>
                    <span className="mastery-percent">{q.mastery}%</span>
                    <span className="mastery-status">{getMasteryLabel(q.mastery)}</span>
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
                  x
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
