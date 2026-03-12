import { useState } from "react";
import type { BankType } from "../../types";
import { CodeEditor } from "../CodeEditor";
import { TerminalInput } from "../TerminalInput";

type Props = {
  bankType: BankType;
  bankLanguage?: string | null;
  onClose: () => void;
  onAdd: (question: string, answer: string) => Promise<void>;
};

export function AddQuestionModal({
  bankType,
  bankLanguage,
  onClose,
  onAdd,
}: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const isCodeMode = bankType === "code" || bankType === "cli";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await onAdd(question.trim(), answer.trim());
      onClose();
    } catch (err: unknown) {
      console.error("Failed to add question:", err);
    } finally {
      setIsAdding(false);
    }
  }

  if (isCodeMode) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal add-question-modal-split"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header-split">
            <h2>Add Question</h2>
            <button className="btn-close" onClick={onClose}>
              x
            </button>
          </div>
          <form onSubmit={handleSubmit} className="add-question-form-split">
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
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Right: Expected Answer */}
              <div className="split-editor-panel">
                <div className="split-editor-header">
                  <span className="split-editor-tab active">Expected Answer</span>
                </div>
                <div className="split-editor-content split-editor-content-code">
                  {bankType === "cli" ? (
                    <TerminalInput
                      value={answer}
                      onChange={setAnswer}
                      placeholder="git commit -m 'message'"
                      height="100%"
                    />
                  ) : (
                    <CodeEditor
                      value={answer}
                      onChange={setAnswer}
                      language={bankLanguage || "plaintext"}
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
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!question.trim() || !answer.trim() || isAdding}
              >
                {isAdding ? "Adding..." : "Add Question"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Theory mode: Original vertical layout
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal add-question-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Add Question</h2>
        <form onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="question">
            Question
          </label>
          <textarea
            id="question"
            className="input textarea"
            placeholder="Enter your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
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
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
          />

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!question.trim() || !answer.trim() || isAdding}
            >
              {isAdding ? "Adding..." : "Add Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
