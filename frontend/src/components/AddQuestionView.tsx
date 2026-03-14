import { useState } from "react";
import type { BankType } from "../types";
import { CodeEditor } from "./CodeEditor";
import { TerminalEditor } from "./TerminalEditor";
import { TooltipContent, TooltipHint } from "./ui";
import { getDefaultRules, getAvailableTemplates, DEFAULT_GRADING_RULES, EXTRA_TEMPLATES } from "../utils/gradingTemplates";
import "./AddQuestionView.css";

type Props = {
  bankSubject: string;
  bankType: BankType;
  bankLanguage?: string | null;
  onSave: (question: string, answer: string, gradingPrompt?: string | null) => Promise<void>;
  onCancel: () => void;
};


function getPresetName(prompt: string, bankType: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Built-in";
  if (trimmed === DEFAULT_GRADING_RULES[bankType]?.trim()) {
    return bankType === "cli" ? "Default (CLI)" : bankType === "code" ? "Default (code)" : "Default";
  }
  for (const [, template] of Object.entries(EXTRA_TEMPLATES)) {
    if (trimmed === template.rules.trim()) return template.label;
  }
  return "Custom";
}

export function AddQuestionView({
  bankSubject,
  bankType,
  bankLanguage,
  onSave,
  onCancel,
}: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [gradingPrompt, setGradingPrompt] = useState(() => getDefaultRules(bankType));
  const [showGrading, setShowGrading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const extraTemplates = getAvailableTemplates(bankType);
  const defaultRules = getDefaultRules(bankType);
  const presetName = getPresetName(gradingPrompt, bankType);


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
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") onCancel();
  }

  // Shared grading panel content (used in both layouts)
  const gradingPanel = showGrading ? (
    <div className="grading-prompt-section">
      <textarea
        className="grading-prompt-textarea"
        value={gradingPrompt}
        onChange={(e) => setGradingPrompt(e.target.value)}
        rows={Math.max(1, gradingPrompt.split("\n").length)}
        ref={(el) => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }}
      />
      <div className="grading-templates">
        <span className="templates-label">Presets:</span>
        <button
          type="button"
          className={`template-btn ${gradingPrompt.trim() === defaultRules.trim() ? "template-btn-active" : ""}`}
          onClick={() => setGradingPrompt(defaultRules)}
        >
          {bankType === "cli" ? "Default (CLI)" : bankType === "code" ? "Default (code)" : "Default"}
        </button>
        {extraTemplates.map(([key, template]) => (
          <button
            key={key}
            type="button"
            className={`template-btn ${gradingPrompt.trim() === template.rules.trim() ? "template-btn-active" : ""}`}
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
    </div>
  ) : null;

  // Pill button — click only to toggle grading section open/close
  const gradingPill = (
    <div className="grading-pill-group">
      <button
        type="button"
        className={`grading-pill ${showGrading ? "grading-pill--open" : ""}`}
        onClick={() => setShowGrading((v) => !v)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        {presetName}
        <svg
          className={`grading-pill-chevron ${showGrading ? "grading-pill-chevron--open" : ""}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {!showGrading && (
        <div className="grading-info-group">
          <span className="grading-info-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div className="grading-info-popup">
            {gradingPrompt.trim()
              ? <TooltipContent>{gradingPrompt}</TooltipContent>
              : <TooltipHint>No custom rules — built-in defaults will be used.</TooltipHint>
            }
          </div>
        </div>
      )}
    </div>
  );

  // ── Theory mode ────────────────────────────────────────────────────────────
  if (bankType === "theory") {
    return (
      <div className="theory-session animate-fade-in" onKeyDown={handleKeyDown}>
        <aside className="theory-sidebar">
          <div className="theory-sidebar-header">
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Exit
            </button>
          </div>
          <div className="theory-sidebar-content">
            <div className="theory-sidebar-section">
              <h3 className="theory-sidebar-title">{bankSubject}</h3>
              <span className="theory-badge">Adding Question</span>
            </div>
            <div className="theory-sidebar-section">
              <span className="theory-sidebar-label">Grading</span>
              {gradingPill}
            </div>
          </div>
        </aside>

        <main className="theory-main">
          {gradingPanel}

          <div className="theory-top-section">
            <div className="theory-answer-wrapper">
              <label className="theory-answer-label">Question</label>
              <textarea
                className="theory-textarea"
                placeholder="Enter your question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                autoFocus
              />
            </div>

            <div className="theory-answer-wrapper">
              <label className="theory-answer-label">Expected Answer</label>
              <textarea
                className="theory-textarea"
                placeholder="Enter the expected answer with key points that should be covered..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <div className="theory-answer-footer">
                <span className="theory-hint">
                  {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
                </span>
                <div className="theory-actions">
                  <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={!question.trim() || !answer.trim() || isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Question"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Code / CLI mode ────────────────────────────────────────────────────────
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
          {gradingPill}
          <span className="add-question-view-hint">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
          </span>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim() || isSaving}
          >
            {isSaving ? "Saving..." : "Save Question"}
          </button>
        </div>
      </div>

      {/* Grading panel — collapsed by default, toggled by pill */}
      {gradingPanel}

      {/* Main Content - Split View */}
      <div className="add-question-view-content">
        <div className="add-question-panel">
          <div className="add-question-panel-header">
            <h2>Question</h2>
            <span className="add-question-panel-hint">Describe the coding task</span>
          </div>
          <div className="add-question-panel-content">
            <textarea
              className="add-question-textarea"
              placeholder="Describe the coding task..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="add-question-resizer" />

        <div className="add-question-panel add-question-panel--answer">
          <div className="add-question-panel-header">
            <h2>Expected Answer</h2>
            {bankLanguage && (
              <span className="add-question-panel-language">{bankLanguage}</span>
            )}
          </div>
          <div className="add-question-panel-content add-question-panel-content--code">
            {bankType === "cli" ? (
              <TerminalEditor
                value={answer}
                onChange={setAnswer}
                placeholder="Enter the expected command..."
                height="100%"
              />
            ) : (
              <CodeEditor
                value={answer}
                onChange={setAnswer}
                language={bankLanguage || "plaintext"}
                height="100%"
                showThemeSelector
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
