import { useState, useRef } from "react";
import type { BankType } from "../types";
import { CodeEditor } from "./CodeEditor";
import { QuestionBodyEditor, FormattingToolbar } from "./QuestionBodyEditor";
import type { QuestionBodyEditorHandle } from "./QuestionBodyEditor";
import { TerminalEditor } from "./TerminalEditor";
import { Button, TooltipContent, TooltipHint } from "./ui";
import { getDefaultRules, getAvailableTemplates, DEFAULT_GRADING_RULES, EXTRA_TEMPLATES } from "../utils/gradingTemplates";
import { useViewShortcuts } from "../hooks/useViewShortcuts";
import "./AddQuestionView.css";

type InitialQuestion = {
  subject: string;
  expectedAnswer: string;
  gradingPrompt?: string | null;
  hint?: string | null;
};

type Props = {
  bankSubject: string;
  bankType: BankType;
  bankLanguage?: string | null;
  initialQuestion?: InitialQuestion;
  onSave: (
    question: string,
    answer: string,
    gradingPrompt?: string | null,
    hint?: string | null
  ) => Promise<void>;
  onCancel: () => void;
};


// Clicking blank space in a theory-doc card should focus its text field, but
// not when the click is inside an embedded code block — that would yank focus
// away from the Monaco editor the user just clicked into.
function focusUnlessCodeBlockClick(
  e: React.MouseEvent,
  target: React.RefObject<QuestionBodyEditorHandle | null>
) {
  if ((e.target as HTMLElement).closest(".qbe-code-block")) return;
  target.current?.focus();
}

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
  initialQuestion,
  onSave,
  onCancel,
}: Props) {
  const isEditMode = !!initialQuestion;
  const [question, setQuestion] = useState(initialQuestion?.subject ?? "");
  const [answer, setAnswer] = useState(initialQuestion?.expectedAnswer ?? "");
  const [gradingPrompt, setGradingPrompt] = useState(
    initialQuestion?.gradingPrompt ?? getDefaultRules(bankType)
  );
  const [showGrading, setShowGrading] = useState(false);
  const [hint, setHint] = useState(initialQuestion?.hint ?? "");
  const [showHint, setShowHint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const extraTemplates = getAvailableTemplates(bankType);
  const defaultRules = getDefaultRules(bankType);
  const presetName = getPresetName(gradingPrompt, bankType);
  const questionBodyRef = useRef<QuestionBodyEditorHandle>(null);
  const answerBodyRef = useRef<QuestionBodyEditorHandle>(null);


  async function handleSave() {
    if (!question.trim() || !answer.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const prompt = gradingPrompt.trim() || null;
      const hintValue = hint.trim() || null;
      await onSave(question.trim(), answer.trim(), prompt, hintValue);
    } catch (err: unknown) {
      console.error("Failed to save question:", err);
      setIsSaving(false);
    }
  }

  useViewShortcuts({ onSubmit: handleSave, onEscape: onCancel });

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

  // Optional hint shown to the user during practice — never sent to the grader
  const hintPanel = showHint ? (
    <div className="grading-prompt-section">
      <textarea
        className="grading-prompt-textarea"
        placeholder="Optional nudge shown to the user if they get stuck. Never used for grading."
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        rows={Math.max(1, hint.split("\n").length)}
      />
    </div>
  ) : null;

  const hintPill = (
    <button
      type="button"
      className={`grading-pill ${showHint ? "grading-pill--open" : ""}`}
      onClick={() => setShowHint((v) => !v)}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.75V17h8v-2.25A7 7 0 0 0 12 2z" />
      </svg>
      Hint
      <svg
        className={`grading-pill-chevron ${showHint ? "grading-pill-chevron--open" : ""}`}
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );

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
    // Field-to-field navigation only. Submit and Escape are registered on the
    // document by useViewShortcuts; handling them here too would fire twice.
    function handleFieldNavKeyDown(e: React.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowDown") {
        e.preventDefault();
        answerBodyRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowUp") {
        e.preventDefault();
        questionBodyRef.current?.focus();
      }
    }

    return (
      <div className="theory-doc animate-fade-in" onKeyDown={handleFieldNavKeyDown}>

        {/* Top nav bar */}
        <div className="theory-doc-nav">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to {bankSubject}
          </Button>
          <div className="theory-doc-nav-right">
            {hintPill}
            {gradingPill}
            <span className="theory-doc-hint">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
            </span>
            <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!question.trim() || !answer.trim() || isSaving}
            >
              {isSaving ? "Saving..." : isEditMode ? "Update Question" : "Save Question"}
            </Button>
          </div>
        </div>

        {hintPanel}
        {gradingPanel}

        {/* Cards */}
        <div className="theory-doc-body">

          <div className="theory-doc-card" onClick={(e) => focusUnlessCodeBlockClick(e, questionBodyRef)}>
            <div className="theory-doc-card-header">
              <div className="theory-doc-card-header-left">
                <span className="theory-doc-card-label">Question</span>
              </div>
              <FormattingToolbar target={questionBodyRef} />
            </div>
            <div className="theory-doc-card-content">
              <QuestionBodyEditor
                ref={questionBodyRef}
                value={question}
                onChange={setQuestion}
                placeholder="What do you want to be asked?"
              />
            </div>
          </div>

          <div className="theory-doc-card" onClick={(e) => focusUnlessCodeBlockClick(e, answerBodyRef)}>
            <div className="theory-doc-card-header">
              <div className="theory-doc-card-header-left">
                <span className="theory-doc-card-label">Expected Answer</span>
                <span className="theory-doc-card-sublabel">Key points that should be covered</span>
              </div>
              <FormattingToolbar target={answerBodyRef} />
            </div>
            <div className="theory-doc-card-content">
              <QuestionBodyEditor
                ref={answerBodyRef}
                value={answer}
                onChange={setAnswer}
                placeholder={question.trim() ? "Now define the key points your answer should cover..." : "List the key concepts, facts, or points the answer should cover..."}
              />
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── Code / CLI mode ────────────────────────────────────────────────────────
  return (
    <div className="add-question-view">
      {/* Header */}
      <div className="add-question-view-header">
        <div className="add-question-view-header-left">
          <Button variant="ghost" onClick={onCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to {bankSubject}
          </Button>
        </div>
        <div className="add-question-view-header-right">
          {hintPill}
          {gradingPill}
          <span className="add-question-view-hint">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
          </span>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim() || isSaving}
          >
            {isSaving ? "Saving..." : isEditMode ? "Update Question" : "Save Question"}
          </Button>
        </div>
      </div>

      {/* Hint and grading panels — collapsed by default, toggled by pill */}
      {hintPanel}
      {gradingPanel}

      {/* Main Content - Split View */}
      <div className="add-question-view-content">
        <div className="add-question-panel">
          <div className="add-question-panel-header">
            <div className="add-question-panel-header-left">
              <h2>Question</h2>
              <FormattingToolbar target={questionBodyRef} />
            </div>
            <span className="add-question-panel-hint">Describe the coding task</span>
          </div>
          <div className="add-question-panel-content">
            <QuestionBodyEditor
              ref={questionBodyRef}
              value={question}
              onChange={setQuestion}
              language={bankLanguage || undefined}
              placeholder="Describe the coding task..."
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
