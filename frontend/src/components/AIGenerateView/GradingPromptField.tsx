import { useState } from "react";
import type { BankType } from "../../types";
import {
  getAvailableTemplates,
  getDefaultRules,
} from "../../utils/gradingTemplates";
import { ChevronDownIcon, PencilIcon } from "./icons";

type Props = {
  value: string | null | undefined;
  bankType: BankType;
  onChange: (value: string) => void;
};

/** Per-question grading rules, collapsed until asked for. */
export function GradingPromptField({ value, bankType, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const rules = value || "";

  /** A preset is "active" when the textarea holds exactly its text. */
  const matches = (candidate: string) => rules.trim() === candidate.trim();

  return (
    <div className="aigen-question-field">
      <button
        type="button"
        className="aigen-grading-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <PencilIcon size={12} />
        Grading Prompt
        <ChevronDownIcon
          size={10}
          className={`aigen-chevron ${isOpen ? "aigen-chevron--open" : ""}`}
        />
      </button>
      {isOpen && (
        <>
          <textarea
            className="aigen-grading-textarea"
            value={rules}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Optional: Custom grading rules..."
            rows={Math.max(3, rules.split("\n").length + 1)}
          />
          <div className="aigen-grading-presets">
            <span className="aigen-presets-label">Presets:</span>
            <button
              type="button"
              className={`aigen-preset-btn ${
                matches(getDefaultRules(bankType)) ? "aigen-preset-btn--active" : ""
              }`}
              onClick={() => onChange(getDefaultRules(bankType))}
            >
              Default
            </button>
            {getAvailableTemplates(bankType).map(([key, template]) => (
              <button
                key={key}
                type="button"
                className={`aigen-preset-btn ${
                  matches(template.rules) ? "aigen-preset-btn--active" : ""
                }`}
                onClick={() => onChange(template.rules)}
              >
                {template.label}
              </button>
            ))}
            <button
              type="button"
              className="aigen-preset-btn aigen-preset-btn--clear"
              onClick={() => onChange("")}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
