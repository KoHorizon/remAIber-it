import { useState } from "react";
import type { BankType, ExportData } from "../types";
import { api, type GeneratedQuestion } from "../api";
import { Button, Dropdown, Input, Modal } from "./ui";
import { CodeEditor } from "./CodeEditor";
import { TerminalEditor } from "./TerminalEditor";
import { PROGRAMMING_LANGUAGES } from "../utils/languages";
import {
  getDefaultRules,
  getAvailableTemplates,
} from "../utils/gradingTemplates";
import "./AIGenerateView.css";

type Props = {
  onBack: () => void;
};

type DraftQuestion = GeneratedQuestion & { id: string };

export function AIGenerateView({ onBack }: Props) {
  // Configuration
  const [bankType, setBankType] = useState<BankType>("theory");
  const [language, setLanguage] = useState<string | null>("javascript");
  const [bankSubject, setBankSubject] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [contentItems, setContentItems] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [direction, setDirection] = useState("");
  const [showDirection, setShowDirection] = useState(false);

  // Content modal state
  const [showContentModal, setShowContentModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [editingContentIndex, setEditingContentIndex] = useState<number | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Questions state
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Combine all content items for generation
  const combinedContent = contentItems.join("\n\n---\n\n");
  const canGenerate = contentItems.length > 0 && bankSubject.trim().length > 0;
  const canExport = questions.length > 0;

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return;

    // Confirm if questions already exist
    if (questions.length > 0) {
      const confirmed = window.confirm(
        "This will replace the current questions. Continue?"
      );
      if (!confirmed) return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await api.generateQuestions({
        content: combinedContent,
        bank_type: bankType,
        language: bankType === "code" ? language : null,
        count,
        direction: direction.trim() || undefined,
      });

      setQuestions(
        response.questions.map((q) => ({
          ...q,
          id: crypto.randomUUID(),
        }))
      );
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate questions"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExport() {
    if (!canExport) return;

    const exportData: ExportData = {
      version: "1.1",
      exported_at: new Date().toISOString(),
      folders: [],
      categories: [
        {
          name: categoryName.trim() || "Generated",
          banks: [
            {
              subject: bankSubject.trim(),
              bank_type: bankType,
              language: bankType === "code" ? language : null,
              questions: questions.map((q) => ({
                subject: q.subject,
                expected_answer: q.expected_answer,
                grading_prompt: q.grading_prompt ?? null,
              })),
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bankSubject.trim().replace(/\s+/g, "-").toLowerCase()}-questions.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function handleUpdateQuestion(
    id: string,
    field: "subject" | "expected_answer" | "grading_prompt",
    value: string
  ) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, [field]: field === "grading_prompt" && !value ? null : value }
          : q
      )
    );
  }

  function handleAddQuestion() {
    const newQuestion: DraftQuestion = {
      id: crypto.randomUUID(),
      subject: "",
      expected_answer: "",
      grading_prompt: null,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setEditingId(newQuestion.id);
  }

  function handleOpenContentModal(index?: number) {
    if (index !== undefined) {
      setModalContent(contentItems[index]);
      setEditingContentIndex(index);
    } else {
      setModalContent("");
      setEditingContentIndex(null);
    }
    setShowContentModal(true);
  }

  function handleSaveContent() {
    const trimmed = modalContent.trim();
    if (!trimmed) return;

    if (editingContentIndex !== null) {
      setContentItems((prev) =>
        prev.map((item, i) => (i === editingContentIndex ? trimmed : item))
      );
    } else {
      setContentItems((prev) => [...prev, trimmed]);
    }
    setShowContentModal(false);
    setModalContent("");
    setEditingContentIndex(null);
  }

  function handleDeleteContent(index: number) {
    setContentItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (editingId) {
        setEditingId(null);
      } else {
        onBack();
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }

  // Type switcher
  const typeSwitcher = (
    <div className="aigen-type-switcher">
      <button
        type="button"
        className={`aigen-type-btn ${bankType === "theory" ? "active" : ""}`}
        onClick={() => setBankType("theory")}
      >
        Theory
      </button>
      <button
        type="button"
        className={`aigen-type-btn ${bankType === "code" ? "active" : ""}`}
        onClick={() => setBankType("code")}
      >
        Code
      </button>
      <button
        type="button"
        className={`aigen-type-btn ${bankType === "cli" ? "active" : ""}`}
        onClick={() => setBankType("cli")}
      >
        CLI
      </button>
    </div>
  );

  return (
    <div className="aigen-view animate-fade-in" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="aigen-nav">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <div className="aigen-nav-center">
          <h1 className="aigen-title">Generate Questions</h1>
        </div>
        <div className="aigen-nav-right">
          <span className="aigen-hint">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to generate
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={!canExport}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Body - two columns */}
      <div className="aigen-body">
        {/* Left column - Configuration */}
        <div className="aigen-left">
          <div className="aigen-config-panel">
            <div className="aigen-config-section">
              <Input
                label="Bank Subject"
                value={bankSubject}
                onChange={(e) => setBankSubject(e.target.value)}
                placeholder="e.g., Go Concurrency Patterns"
              />
            </div>

            <div className="aigen-config-section">
              <Input
                label="Category Name (optional)"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Programming"
              />
            </div>

            <div className="aigen-config-section">
              <label className="aigen-label">Bank Type</label>
              {typeSwitcher}
            </div>

            {bankType === "code" && (
              <div className="aigen-config-section">
                <label className="aigen-label">Language</label>
                <Dropdown
                  options={PROGRAMMING_LANGUAGES.map((lang) => ({
                    value: lang.value,
                    label: lang.label,
                  }))}
                  value={language}
                  onChange={(v) => setLanguage(v)}
                  placeholder="Select language..."
                />
              </div>
            )}

            <div className="aigen-config-section">
              <label className="aigen-label">Number of Questions</label>
              <div className="aigen-count-input">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="aigen-range"
                />
                <span className="aigen-count-value">{count}</span>
              </div>
            </div>

            <div className="aigen-config-section">
              <button
                type="button"
                className={`aigen-direction-toggle ${showDirection ? "aigen-direction-toggle--open" : ""}`}
                onClick={() => setShowDirection(!showDirection)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                AI Direction
                {direction && <span className="aigen-direction-indicator" />}
                <svg
                  className={`aigen-direction-chevron ${showDirection ? "aigen-direction-chevron--open" : ""}`}
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showDirection && (
                <div className="aigen-direction-section">
                  <textarea
                    className="aigen-direction-textarea"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    placeholder="e.g., Focus on practical scenarios, make questions harder..."
                    rows={3}
                  />
                  <div className="aigen-direction-presets">
                    <span className="aigen-presets-label">Presets:</span>
                    <button
                      type="button"
                      className="aigen-preset-btn"
                      onClick={() => setDirection("Keep questions simple and beginner-friendly")}
                    >
                      Beginner
                    </button>
                    <button
                      type="button"
                      className="aigen-preset-btn"
                      onClick={() => setDirection("Make questions challenging, focus on edge cases")}
                    >
                      Advanced
                    </button>
                    <button
                      type="button"
                      className="aigen-preset-btn"
                      onClick={() => setDirection("Focus on practical real-world scenarios")}
                    >
                      Practical
                    </button>
                    <button
                      type="button"
                      className="aigen-preset-btn aigen-preset-btn--clear"
                      onClick={() => setDirection("")}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="aigen-config-section aigen-config-section--grow">
              <label className="aigen-label">Study Material</label>
              <div className="aigen-content-cards">
                {contentItems.map((item, index) => (
                  <div
                    key={index}
                    className="aigen-content-card"
                    onClick={() => handleOpenContentModal(index)}
                  >
                    <div className="aigen-content-card-text">
                      {item.length > 100 ? item.slice(0, 100) + "..." : item}
                    </div>
                    <button
                      type="button"
                      className="aigen-content-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContent(index);
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="aigen-add-content-btn"
                  onClick={() => handleOpenContentModal()}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Add</span>
                </button>
              </div>
              <span className="aigen-char-count">
                {contentItems.length} item{contentItems.length !== 1 ? "s" : ""} · {combinedContent.length.toLocaleString()} characters
              </span>
            </div>

            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <svg
                    className="aigen-spinner"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generate Questions
                </>
              )}
            </Button>

            {generateError && (
              <div className="aigen-error">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {generateError}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Questions */}
        <div className="aigen-right">
          <div className="aigen-questions-header">
            <h2>Generated Questions</h2>
            <span className="aigen-questions-count">
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="aigen-empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <p>Generated questions will appear here</p>
              <span>Paste your study material and click Generate</span>
            </div>
          ) : (
            <div className="aigen-questions-list">
              {questions.map((q, index) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={index}
                  bankType={bankType}
                  language={language}
                  isEditing={editingId === q.id}
                  onEdit={() => setEditingId(q.id)}
                  onDone={() => setEditingId(null)}
                  onDelete={() => handleDeleteQuestion(q.id)}
                  onUpdate={(field, value) => handleUpdateQuestion(q.id, field, value)}
                />
              ))}
              <button
                type="button"
                className="aigen-add-question"
                onClick={handleAddQuestion}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Modal */}
      {showContentModal && (
        <div className="aigen-content-modal">
          <Modal
            title={editingContentIndex !== null ? "Edit Content" : "Add Study Material"}
            onClose={() => {
              setShowContentModal(false);
              setModalContent("");
              setEditingContentIndex(null);
            }}
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowContentModal(false);
                    setModalContent("");
                    setEditingContentIndex(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveContent}
                  disabled={!modalContent.trim()}
                >
                  {editingContentIndex !== null ? "Save" : "Add"}
                </Button>
              </>
            }
          >
            <div className="aigen-modal-content">
              <textarea
                className="aigen-modal-textarea"
                value={modalContent}
                onChange={(e) => setModalContent(e.target.value)}
                placeholder="Paste your study material, documentation, or notes here..."
                autoFocus
              />
              <span className="aigen-modal-char-count">
                {modalContent.length.toLocaleString()} characters
              </span>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}

type QuestionCardProps = {
  question: DraftQuestion;
  index: number;
  bankType: BankType;
  language: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onDelete: () => void;
  onUpdate: (field: "subject" | "expected_answer" | "grading_prompt", value: string) => void;
};

function QuestionCard({
  question,
  index,
  bankType,
  language,
  isEditing,
  onEdit,
  onDone,
  onDelete,
  onUpdate,
}: QuestionCardProps) {
  const [showGradingPrompt, setShowGradingPrompt] = useState(false);

  if (isEditing) {
    return (
      <div className="aigen-question-card aigen-question-card--editing">
        <div className="aigen-question-number">{index + 1}</div>
        <div className="aigen-question-content">
          <div className="aigen-question-field">
            <label>Question</label>
            <textarea
              value={question.subject}
              onChange={(e) => onUpdate("subject", e.target.value)}
              placeholder="Enter question..."
              autoFocus
            />
          </div>
          <div className="aigen-question-field">
            <label>Expected Answer</label>
            {bankType === "theory" ? (
              <textarea
                value={question.expected_answer}
                onChange={(e) => onUpdate("expected_answer", e.target.value)}
                placeholder="Enter expected answer..."
              />
            ) : bankType === "cli" ? (
              <TerminalEditor
                value={question.expected_answer}
                onChange={(v) => onUpdate("expected_answer", v)}
                placeholder="Enter expected command..."
                height="100px"
              />
            ) : (
              <CodeEditor
                value={question.expected_answer}
                onChange={(v) => onUpdate("expected_answer", v)}
                language={language || "plaintext"}
                height="120px"
              />
            )}
          </div>
          <div className="aigen-question-field">
            <button
              type="button"
              className="aigen-grading-toggle"
              onClick={() => setShowGradingPrompt(!showGradingPrompt)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Grading Prompt
              <svg
                className={`aigen-chevron ${showGradingPrompt ? "aigen-chevron--open" : ""}`}
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showGradingPrompt && (
              <>
                <textarea
                  className="aigen-grading-textarea"
                  value={question.grading_prompt || ""}
                  onChange={(e) => onUpdate("grading_prompt", e.target.value)}
                  placeholder="Optional: Custom grading rules..."
                  rows={Math.max(3, (question.grading_prompt || "").split("\n").length + 1)}
                />
                <div className="aigen-grading-presets">
                  <span className="aigen-presets-label">Presets:</span>
                  <button
                    type="button"
                    className={`aigen-preset-btn ${
                      (question.grading_prompt || "").trim() === getDefaultRules(bankType).trim()
                        ? "aigen-preset-btn--active"
                        : ""
                    }`}
                    onClick={() => onUpdate("grading_prompt", getDefaultRules(bankType))}
                  >
                    Default
                  </button>
                  {getAvailableTemplates(bankType).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      className={`aigen-preset-btn ${
                        (question.grading_prompt || "").trim() === template.rules.trim()
                          ? "aigen-preset-btn--active"
                          : ""
                      }`}
                      onClick={() => onUpdate("grading_prompt", template.rules)}
                    >
                      {template.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="aigen-preset-btn aigen-preset-btn--clear"
                    onClick={() => onUpdate("grading_prompt", "")}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="aigen-question-actions">
          <button
            type="button"
            className="aigen-action-btn aigen-action-btn--done"
            onClick={onDone}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button
            type="button"
            className="aigen-action-btn aigen-action-btn--delete"
            onClick={onDelete}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aigen-question-card" onClick={onEdit}>
      <div className="aigen-question-number">{index + 1}</div>
      <div className="aigen-question-content">
        <div className="aigen-question-subject">{question.subject || "(empty question)"}</div>
        <div className="aigen-question-answer">
          {bankType === "theory" ? (
            question.expected_answer || "(empty answer)"
          ) : (
            <code>{question.expected_answer || "(empty answer)"}</code>
          )}
        </div>
        {question.grading_prompt && (
          <div className="aigen-question-grading">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Custom grading rules
          </div>
        )}
      </div>
      <div className="aigen-question-actions">
        <button
          type="button"
          className="aigen-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          type="button"
          className="aigen-action-btn aigen-action-btn--delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
