import { useState } from "react";
import type { BankType } from "../types";
import { CodeEditor } from "./CodeEditor";
import { TerminalInput } from "./TerminalInput";
import { DEFAULT_GRADING_RULES, EXTRA_TEMPLATES } from "../utils/gradingTemplates";
import "./AddQuestionView.css";

type Props = {
  bankSubject: string;
  bankType: BankType;
  bankLanguage?: string | null;
  bankGradingPrompt?: string | null;
  onSave: (question: string, answer: string, gradingPrompt?: string | null) => Promise<void>;
  onCancel: () => void;
};

export function AddQuestionView({
  bankSubject,
  bankType,
  bankLanguage,
  bankGradingPrompt,
  onSave,
  onCancel,
}: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [gradingPrompt, setGradingPrompt] = useState("");
  const [showGradingPrompt, setShowGradingPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isCodeMode = bankType === "code" || bankType === "cli";

  // Find the preset name for the bank's grading prompt
  function getPresetName(prompt: string | null | undefined): string {
    if (!prompt) return "Default";

    // Check if it matches a default rule
    for (const [type, rules] of Object.entries(DEFAULT_GRADING_RULES)) {
      if (rules.trim() === prompt.trim()) {
        const typeLabels: Record<string, string> = {
          theory: "Default (concepts)",
          code: "Default (code)",
          cli: "Default (CLI)",
        };
        return typeLabels[type] || "Default";
      }
    }

    // Check if it matches an extra template
    for (const [, template] of Object.entries(EXTRA_TEMPLATES)) {
      if (template.rules.trim() === prompt.trim()) {
        return template.label;
      }
    }

    return "Custom";
  }

  const presetName = getPresetName(bankGradingPrompt);

  async function handleSave() {
    if (!question.trim() || !answer.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const prompt = gradingPrompt.trim() || null;
      await onSave(question.trim(), answer.trim(), prompt);
    } catch (err: unknown) {
      console.error("Failed to save question:", err);
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Cmd/Ctrl + Enter to save
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === "Escape") {
      onCancel();
    }
  }

  return (
    <div className="add-question-view" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="add-question-view-header">
        <div className="add-question-view-header-left">
          <button className="btn btn-ghost" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to {bankSubject}
          </button>
        </div>
        <div className="add-question-view-header-right">
          <span className="add-question-view-hint">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
          </span>
          <div className="grading-btn-wrapper">
            <button
              className={`btn ${showGradingPrompt || gradingPrompt.trim() ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => setShowGradingPrompt(!showGradingPrompt)}
              type="button"
            >
              {gradingPrompt.trim() ? "Custom Grading" : bankGradingPrompt ? "Bank Default" : "Grading"}
            </button>
            {bankGradingPrompt && !showGradingPrompt && (
              <div className="grading-prompt-tooltip">
                <div className="grading-prompt-tooltip-title">{presetName}</div>
                <div className="grading-prompt-tooltip-content">{bankGradingPrompt}</div>
                <div className="grading-prompt-tooltip-hint">Click to customize for this question</div>
              </div>
            )}
          </div>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim() || isSaving}
          >
            {isSaving ? "Saving..." : "Save Question"}
          </button>
        </div>
      </div>

      {/* Grading Prompt Section */}
      {showGradingPrompt && (
        <div className="grading-prompt-section">
          <div className="grading-prompt-section-header">
            <label className="grading-prompt-label">
              Custom Grading Instructions
            </label>
            {bankGradingPrompt && (
              <div className="grading-prompt-default-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>Bank default</span>
                <div className="grading-prompt-tooltip">
                  <div className="grading-prompt-tooltip-title">Bank Default Rules</div>
                  <div className="grading-prompt-tooltip-content">{bankGradingPrompt}</div>
                  <div className="grading-prompt-tooltip-hint">Leave empty to use this</div>
                </div>
              </div>
            )}
          </div>
          <textarea
            className="grading-prompt-textarea"
            placeholder={bankGradingPrompt
              ? "Leave empty to use bank default, or write custom instructions..."
              : "Add custom instructions for the LLM grader (e.g., 'Be strict about exact syntax' or 'Accept any valid solution')..."
            }
            value={gradingPrompt}
            onChange={(e) => setGradingPrompt(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="add-question-view-content">
        {/* Left Panel - Question */}
        <div className="add-question-panel">
          <div className="add-question-panel-header">
            <h2>Question</h2>
            {isCodeMode && (
              <span className="add-question-panel-hint">
                Describe the coding task
              </span>
            )}
          </div>
          <div className="add-question-panel-content">
            <textarea
              className="add-question-textarea"
              placeholder={isCodeMode
                ? "Describe what the user should implement...\n\nExample:\nWrite a function called `reverseString` that takes a string as input and returns the string reversed.\n\nRequirements:\n- Do not use built-in reverse methods\n- Handle empty strings\n- Handle unicode characters"
                : "Enter your question..."
              }
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Resizer */}
        <div className="add-question-resizer" />

        {/* Right Panel - Expected Answer */}
        <div className="add-question-panel add-question-panel--answer">
          <div className="add-question-panel-header">
            <h2>Expected Answer</h2>
            {isCodeMode && bankLanguage && (
              <span className="add-question-panel-language">{bankLanguage}</span>
            )}
          </div>
          <div className="add-question-panel-content add-question-panel-content--code">
            {bankType === "cli" ? (
              <TerminalInput
                value={answer}
                onChange={setAnswer}
                placeholder="Enter the expected command..."
                height="100%"
              />
            ) : bankType === "code" ? (
              <CodeEditor
                value={answer}
                onChange={setAnswer}
                language={bankLanguage || "plaintext"}
                height="100%"
                showThemeSelector
              />
            ) : (
              <textarea
                className="add-question-textarea"
                placeholder="Enter the expected answer with key points that should be covered..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
