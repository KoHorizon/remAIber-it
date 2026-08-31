import { useEffect, useRef } from "react";
import { getAvailableTemplates, getDefaultRules } from "../../utils/gradingTemplates";
import { defaultLabel } from "./presetName";

type Props = {
  value: string;
  bankType: string;
  onChange: (value: string) => void;
};

/**
 * The grading rules editor, with the presets available for this bank type.
 *
 * Owns its own textarea ref: the focus-on-open effect is the only thing that
 * needed it, and mounting is what "open" means here, so the effect has no
 * dependency to track.
 */
export function GradingRulesPanel({ value, bankType, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const defaultRules = getDefaultRules(bankType);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    // Caret at the end, so typing appends a rule instead of overwriting them.
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  /** A preset is active when the text still matches it exactly. */
  const isActive = (rules: string) => value.trim() === rules.trim();

  return (
    <div className="simulation-grading-section">
      <textarea
        ref={textareaRef}
        className="simulation-grading-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(1, value.split("\n").length)}
      />
      <div className="simulation-grading-templates">
        <span className="templates-label">Presets:</span>
        <button
          type="button"
          className={`template-btn ${isActive(defaultRules) ? "template-btn-active" : ""}`}
          onClick={() => onChange(defaultRules)}
        >
          {defaultLabel(bankType)}
        </button>
        {getAvailableTemplates(bankType).map(([key, template]) => (
          <button
            key={key}
            type="button"
            className={`template-btn ${isActive(template.rules) ? "template-btn-active" : ""}`}
            onClick={() => onChange(template.rules)}
          >
            {template.label}
          </button>
        ))}
        <button
          type="button"
          className="template-btn template-btn-clear"
          onClick={() => onChange("")}
        >
          Clear (use built-in)
        </button>
      </div>
    </div>
  );
}
