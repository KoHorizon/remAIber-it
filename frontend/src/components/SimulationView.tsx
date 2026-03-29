import { useState, useEffect, useRef } from "react";
import type { BankType } from "../types";
import { useLibraryData } from "../context";
import { api, type SimulateGradeResult } from "../api";
import { CodeEditor } from "./CodeEditor";
import { TerminalEditor } from "./TerminalEditor";
import { Button, Dropdown, TooltipContent, TooltipHint } from "./ui";
import {
  getDefaultRules,
  getAvailableTemplates,
  DEFAULT_GRADING_RULES,
  EXTRA_TEMPLATES,
} from "../utils/gradingTemplates";
import { PROGRAMMING_LANGUAGES } from "../utils/languages";
import "./SimulationView.css";

type Props = {
  onBack: () => void;
};

function getPresetName(prompt: string, bankType: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Built-in";
  if (trimmed === DEFAULT_GRADING_RULES[bankType]?.trim()) {
    return bankType === "cli"
      ? "Default (CLI)"
      : bankType === "code"
        ? "Default (code)"
        : "Default";
  }
  for (const [, template] of Object.entries(EXTRA_TEMPLATES)) {
    if (trimmed === template.rules.trim()) return template.label;
  }
  return "Custom";
}

function getScoreClass(score: number) {
  if (score >= 90) return "score-excellent";
  if (score >= 70) return "score-good";
  if (score >= 50) return "score-needs-work";
  return "score-poor";
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs work";
  return "Poor";
}

export function SimulationView({ onBack }: Props) {
  const { categories, banks } = useLibraryData();

  // Simulation inputs
  const [bankType, setBankType] = useState<BankType>("theory");
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [gradingPrompt, setGradingPrompt] = useState(() =>
    getDefaultRules("theory")
  );
  const [language, setLanguage] = useState<string | null>("javascript");
  const [showGrading, setShowGrading] = useState(false);

  // Grading state
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<SimulateGradeResult | null>(
    null
  );
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Save to bank state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveView, setShowSaveView] = useState(false);
  const [isClosingResult, setIsClosingResult] = useState(false);

  const questionRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const testRef = useRef<HTMLTextAreaElement>(null);
  const gradingRef = useRef<HTMLTextAreaElement>(null);

  // Reset grading prompt and clear results when bank type changes
  useEffect(() => {
    setGradingPrompt(getDefaultRules(bankType));
    setGradeResult(null);
    setGradeError(null);
  }, [bankType]);

  // Focus grading textarea when panel opens
  useEffect(() => {
    if (showGrading && gradingRef.current) {
      gradingRef.current.focus();
      gradingRef.current.setSelectionRange(
        gradingRef.current.value.length,
        gradingRef.current.value.length
      );
    }
  }, [showGrading]);

  // Close results when inputs change
  useEffect(() => {
    if (gradeResult) {
      setGradeResult(null);
      setShowSaveView(false);
    }
  }, [question, expectedAnswer, testAnswer, gradingPrompt]);

  // Reset bank selection when category or bank type changes
  useEffect(() => {
    setSelectedBankId(null);
  }, [selectedCategoryId, bankType]);

  // Filter banks by category and bank type
  const matchingBanks = banks.filter(
    (b) =>
      b.bank_type === bankType &&
      (selectedCategoryId === null
        ? b.category_id === null || b.category_id === undefined
        : b.category_id === selectedCategoryId)
  );

  const canGrade =
    question.trim() && expectedAnswer.trim() && testAnswer.trim();
  const canSave = gradeResult && selectedBankId;

  async function handleGrade() {
    if (!canGrade || isGrading) return;
    setIsGrading(true);
    setGradeError(null);
    try {
      const result = await api.simulateGrade({
        question: question.trim(),
        expected_answer: expectedAnswer.trim(),
        user_answer: testAnswer.trim(),
        bank_type: bankType,
        grading_prompt: gradingPrompt.trim() || null,
      });
      setGradeResult(result);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Grading failed");
      setGradeResult(null);
    } finally {
      setIsGrading(false);
    }
  }

  async function handleSave() {
    if (!canSave || isSaving || !selectedBankId) return;
    setIsSaving(true);
    try {
      // Wait for backend to complete
      await api.addQuestion(
        selectedBankId,
        question.trim(),
        expectedAnswer.trim(),
        gradingPrompt.trim() || null
      );
      setIsSaving(false);

      // Start close animation (slide down)
      setIsClosingResult(true);
      setTimeout(() => {
        // Reset everything after animation completes
        setGradeResult(null);
        setGradeError(null);
        setIsClosingResult(false);
        setShowSaveView(false);
        setQuestion("");
        setExpectedAnswer("");
        setTestAnswer("");
        setShowGrading(false);
        setGradingPrompt(getDefaultRules(bankType));
      }, 300);
    } catch (err) {
      console.error("Failed to save question:", err);
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGrade();
    }
    if (e.key === "Escape") onBack();
  }

  const extraTemplates = getAvailableTemplates(bankType);
  const defaultRules = getDefaultRules(bankType);
  const presetName = getPresetName(gradingPrompt, bankType);

  // Grading panel (same pattern as AddQuestionView)
  const gradingPanel = showGrading ? (
    <div className="simulation-grading-section">
      <textarea
        ref={gradingRef}
        className="simulation-grading-textarea"
        value={gradingPrompt}
        onChange={(e) => setGradingPrompt(e.target.value)}
        rows={Math.max(1, gradingPrompt.split("\n").length)}
      />
      <div className="simulation-grading-templates">
        <span className="templates-label">Presets:</span>
        <button
          type="button"
          className={`template-btn ${gradingPrompt.trim() === defaultRules.trim() ? "template-btn-active" : ""}`}
          onClick={() => setGradingPrompt(defaultRules)}
        >
          {bankType === "cli"
            ? "Default (CLI)"
            : bankType === "code"
              ? "Default (code)"
              : "Default"}
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

  // Grading pill
  const gradingPill = (
    <div className="grading-pill-group">
      <button
        type="button"
        className={`grading-pill ${showGrading ? "grading-pill--open" : ""}`}
        onClick={() => setShowGrading((v) => !v)}
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
        {presetName}
        <svg
          className={`grading-pill-chevron ${showGrading ? "grading-pill-chevron--open" : ""}`}
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
      {!showGrading && (
        <div className="grading-info-group">
          <span className="grading-info-btn">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <div className="grading-info-popup">
            {gradingPrompt.trim() ? (
              <TooltipContent>{gradingPrompt}</TooltipContent>
            ) : (
              <TooltipHint>
                No custom rules — built-in defaults will be used.
              </TooltipHint>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Type switcher (extracted to avoid TypeScript narrowing issues)
  const typeSwitcher = (
    <div className="simulation-type-switcher">
      <button
        type="button"
        className={`simulation-type-btn ${bankType === "theory" ? "active" : ""}`}
        onClick={() => setBankType("theory")}
      >
        Theory
      </button>
      <button
        type="button"
        className={`simulation-type-btn ${bankType === "code" ? "active" : ""}`}
        onClick={() => setBankType("code")}
      >
        Code
      </button>
      <button
        type="button"
        className={`simulation-type-btn ${bankType === "cli" ? "active" : ""}`}
        onClick={() => setBankType("cli")}
      >
        CLI
      </button>
    </div>
  );

  // Result card with save functionality
  const resultCard = gradeResult && (
    <div className={`simulation-result-row ${isClosingResult ? "animate-slide-down" : "animate-slide-up"}`}>
      <div className={`simulation-result-slider ${showSaveView ? "simulation-result-slider--save" : ""}`}>
        {/* Score view */}
        <div className="simulation-result-slide">
          <button
            type="button"
            className="simulation-save-btn"
            onClick={() => setShowSaveView(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save
          </button>
          <div className="simulation-result-grid">
            <div className="simulation-result">
              <div className="simulation-result-header">
                <div
                  className={`simulation-score-badge ${getScoreClass(gradeResult.score)}`}
                >
                  <span className="simulation-score-value">{gradeResult.score}%</span>
                  <span className="simulation-score-label">
                    {getScoreLabel(gradeResult.score)}
                  </span>
                </div>
              </div>
              <div className="simulation-result-feedback">
                {gradeResult.covered.length > 0 && (
                  <div className="simulation-feedback-group">
                    <span className="simulation-feedback-heading simulation-feedback-heading--covered">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Covered
                    </span>
                    <div className="simulation-chips">
                      {gradeResult.covered.map((item, i) => (
                        <span key={i} className="simulation-chip simulation-chip--covered">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {gradeResult.missed.length > 0 && (
                  <div className="simulation-feedback-group">
                    <span className="simulation-feedback-heading simulation-feedback-heading--missed">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Missed
                    </span>
                    <div className="simulation-chips">
                      {gradeResult.missed.map((item, i) => (
                        <span key={i} className="simulation-chip simulation-chip--missed">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="simulation-result-prompt">
              <div className="simulation-result-prompt-header">
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
                Grading Rules
              </div>
              <div className="simulation-result-prompt-content">
                {gradingPrompt.trim() || "Using built-in default rules"}
              </div>
            </div>
          </div>
        </div>
        {/* Save view */}
        <div className="simulation-result-slide simulation-result-slide--save">
          <button
            type="button"
            className="simulation-back-btn"
            onClick={() => setShowSaveView(false)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="simulation-save-content">
            <h3 className="simulation-save-title">Save Question</h3>
            <p className="simulation-save-hint">Add to an existing bank to practice later</p>

            {/* Category chips */}
            <div className="simulation-save-section">
              <span className="simulation-save-label">Category</span>
              <div className="simulation-save-chips">
                <button
                  type="button"
                  className={`simulation-save-chip ${selectedCategoryId === null ? "simulation-save-chip--selected" : ""}`}
                  onClick={() => setSelectedCategoryId(null)}
                >
                  Uncategorized
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`simulation-save-chip ${selectedCategoryId === c.id ? "simulation-save-chip--selected" : ""}`}
                    onClick={() => setSelectedCategoryId(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Bank chips */}
            <div className="simulation-save-section">
              <span className="simulation-save-label">Bank</span>
              {matchingBanks.length > 0 ? (
                <div className="simulation-save-chips">
                  {matchingBanks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`simulation-save-chip ${selectedBankId === b.id ? "simulation-save-chip--selected" : ""}`}
                      onClick={() => setSelectedBankId(b.id)}
                    >
                      {b.subject}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="simulation-save-empty">
                  No {bankType} banks in this category
                </p>
              )}
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? "Saving..." : "Save to Bank"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Error card
  const errorCard = gradeError && (
    <div className="simulation-error animate-slide-up">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {gradeError}
    </div>
  );


  // ── Theory mode layout ─────────────────────────────────────────────────────
  if (bankType === "theory") {
    function handleTheoryKeyDown(e: React.KeyboardEvent) {
      handleKeyDown(e);
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowDown") {
        e.preventDefault();
        if (document.activeElement === questionRef.current) {
          answerRef.current?.focus();
        } else if (document.activeElement === answerRef.current) {
          testRef.current?.focus();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowUp") {
        e.preventDefault();
        if (document.activeElement === testRef.current) {
          answerRef.current?.focus();
        } else if (document.activeElement === answerRef.current) {
          questionRef.current?.focus();
        }
      }
    }

    return (
      <div
        className="simulation-view simulation-view--theory animate-fade-in"
        onKeyDown={handleTheoryKeyDown}
      >
        {/* Header */}
        <div className="simulation-nav">
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
          <div className="simulation-nav-center" />
          <div className="simulation-nav-right">
            {gradingPill}
            <span className="simulation-hint">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to grade
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGrade}
              disabled={!canGrade || isGrading}
            >
              {isGrading ? "Grading..." : "Run Simulation"}
            </Button>
          </div>
        </div>

        {gradingPanel}

        {/* Body */}
        <div className="simulation-body">
          {/* Section header with type switcher */}
          <div className="simulation-section-header">
            <h2 className="simulation-section-title">Question Setup</h2>
            {typeSwitcher}
          </div>

          <div className="simulation-cards-row">
            <div
              className="simulation-card"
              onClick={() => questionRef.current?.focus()}
            >
              <div className="simulation-card-header">
                <span className="simulation-card-label">Question</span>
              </div>
              <textarea
                ref={questionRef}
                className="simulation-card-textarea"
                placeholder="What do you want to test?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                autoFocus
              />
            </div>

            <div
              className="simulation-card"
              onClick={() => answerRef.current?.focus()}
            >
              <div className="simulation-card-header">
                <span className="simulation-card-label">Expected Answer</span>
                <span className="simulation-card-sublabel">
                  Key points that should be covered
                </span>
              </div>
              <textarea
                ref={answerRef}
                className="simulation-card-textarea"
                placeholder="List the key concepts the answer should cover..."
                value={expectedAnswer}
                onChange={(e) => setExpectedAnswer(e.target.value)}
              />
            </div>
          </div>

          <div className="simulation-test-section">
            <div
              className="simulation-card simulation-card--test"
              onClick={() => testRef.current?.focus()}
            >
              <div className="simulation-card-header">
                <span className="simulation-card-label">Your Test Answer</span>
                <span className="simulation-card-sublabel">
                  This is what will be graded
                </span>
              </div>
              <textarea
                ref={testRef}
                className="simulation-card-textarea"
                placeholder="Type your test answer here to see how it grades..."
                value={testAnswer}
                onChange={(e) => setTestAnswer(e.target.value)}
              />
            </div>
          </div>

          {errorCard}
          {resultCard}
        </div>
      </div>
    );
  }

  // ── Code / CLI mode layout ─────────────────────────────────────────────────
  return (
    <div className="simulation-view simulation-view--code animate-fade-in" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="simulation-nav">
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
        <div className="simulation-nav-center" />
        <div className="simulation-nav-right">
          {gradingPill}
          <span className="simulation-hint">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to grade
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGrade}
            disabled={!canGrade || isGrading}
          >
            {isGrading ? "Grading..." : "Run Simulation"}
          </Button>
        </div>
      </div>

      {gradingPanel}

      {/* Split layout */}
      <div className="simulation-code-body">
        <div className="simulation-code-left">
          <div className="simulation-code-panel">
            <div className="simulation-code-panel-header">
              <h2>Question</h2>
              <span className="simulation-code-panel-hint">
                Describe the coding task
              </span>
              <div className="simulation-code-panel-controls">
                {bankType === "code" && (
                  <Dropdown
                    options={PROGRAMMING_LANGUAGES.map((lang) => ({
                      value: lang.value,
                      label: lang.label,
                    }))}
                    value={language}
                    onChange={(v) => setLanguage(v)}
                    placeholder="Select language..."
                  />
                )}
                {typeSwitcher}
              </div>
            </div>
            <div className="simulation-code-panel-content">
              <textarea
                className="simulation-code-textarea"
                placeholder="Describe the coding task..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="simulation-code-right">
          <div className="simulation-code-panel">
            <div className="simulation-code-panel-header">
              <h2>Expected Answer</h2>
              {bankType === "code" && language && (
                <span className="simulation-code-panel-language">{language}</span>
              )}
            </div>
            <div className="simulation-code-panel-content simulation-code-panel-content--editor">
              {bankType === "cli" ? (
                <TerminalEditor
                  value={expectedAnswer}
                  onChange={setExpectedAnswer}
                  placeholder="Enter the expected command..."
                  height="100%"
                />
              ) : (
                <CodeEditor
                  value={expectedAnswer}
                  onChange={setExpectedAnswer}
                  language={language || "plaintext"}
                  height="100%"
                  showThemeSelector
                />
              )}
            </div>
          </div>

          <div className="simulation-code-panel simulation-code-panel--test">
            <div className="simulation-code-panel-header">
              <h2>Your Test Answer</h2>
              <span className="simulation-code-panel-hint">
                This is what will be graded
              </span>
            </div>
            <div className="simulation-code-panel-content simulation-code-panel-content--editor">
              {bankType === "cli" ? (
                <TerminalEditor
                  value={testAnswer}
                  onChange={setTestAnswer}
                  placeholder="Enter your test command..."
                  height="100%"
                />
              ) : (
                <CodeEditor
                  value={testAnswer}
                  onChange={setTestAnswer}
                  language={language || "plaintext"}
                  height="100%"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results below the split */}
      <div className="simulation-code-results">
        {errorCard}
        {resultCard}
      </div>
    </div>
  );
}
