import { useState } from "react";
import { getDefaultRules, getAvailableTemplates } from "../../utils/gradingTemplates";

type Props = {
  bankType: string;
  currentPrompt: string | null;
  onClose: () => void;
  onSave: (prompt: string | null) => Promise<void>;
};

export function GradingSettingsModal({
  bankType,
  currentPrompt,
  onClose,
  onSave,
}: Props) {
  const [gradingPrompt, setGradingPrompt] = useState(
    currentPrompt || getDefaultRules(bankType)
  );
  const [isSaving, setIsSaving] = useState(false);

  const extraTemplates = getAvailableTemplates(bankType);

  async function handleSave() {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const trimmed = gradingPrompt.trim();
      await onSave(trimmed || null);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save grading prompt:", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal grading-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Grading Rules</h2>
        <p className="grading-settings-description">
          These rules tell the AI how to judge whether your answer covers each
          key point. The system automatically splits expected answers into
          checkpoints - you only control the matching criteria here. Keep it
          short for best results with local models.
        </p>

        <label className="input-label" htmlFor="grading-prompt">
          Matching rules
          <span className="input-hint">
            {" "}
            - each line should start with <code>-</code>
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
                gradingPrompt === template.rules ? "template-btn-active" : ""
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
              <strong>Tip:</strong> If grading feels too strict or too lenient,
              try a different preset or write your own rules. Shorter rules work
              better with small local models.
            </p>
          </div>
        </details>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
