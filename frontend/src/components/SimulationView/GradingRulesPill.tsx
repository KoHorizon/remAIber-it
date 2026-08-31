import { TooltipContent, TooltipHint } from "../ui";
import { ChevronDownIcon, InfoIcon, PencilIcon } from "./icons";
import { getPresetName } from "./presetName";

type Props = {
  gradingPrompt: string;
  bankType: string;
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * The collapsed handle for the grading rules: names the preset in force and
 * opens the editor. While closed it also carries a hover readout of the rules,
 * since that's the only way to see them without opening the panel.
 */
export function GradingRulesPill({ gradingPrompt, bankType, isOpen, onToggle }: Props) {
  return (
    <div className="grading-pill-group">
      <button
        type="button"
        className={`grading-pill ${isOpen ? "grading-pill--open" : ""}`}
        onClick={onToggle}
      >
        <PencilIcon />
        {getPresetName(gradingPrompt, bankType)}
        <ChevronDownIcon
          className={`grading-pill-chevron ${isOpen ? "grading-pill-chevron--open" : ""}`}
        />
      </button>
      {!isOpen && (
        <div className="grading-info-group">
          <span className="grading-info-btn">
            <InfoIcon />
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
}
