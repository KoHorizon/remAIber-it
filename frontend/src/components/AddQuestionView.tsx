import { useState } from "react";
import type { BankType } from "../types";
import { CodeEditor } from "./CodeEditor";
import { TerminalInput } from "./TerminalInput";
import "./AddQuestionView.css";

type Props = {
  bankSubject: string;
  bankType: BankType;
  bankLanguage?: string | null;
  onSave: (question: string, answer: string) => Promise<void>;
  onCancel: () => void;
};

export function AddQuestionView({
  bankSubject,
  bankType,
  bankLanguage,
  onSave,
  onCancel,
}: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isCodeMode = bankType === "code" || bankType === "cli";

  async function handleSave() {
    if (!question.trim() || !answer.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(question.trim(), answer.trim());
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
