import type { SimulateGradeResult } from "../../api";
import { getScoreClass, getScoreLabel } from "../../utils/scoreBuckets";
import { CheckIcon, CloseIcon, PencilIcon, SaveIcon } from "./icons";

type FeedbackProps = {
  heading: string;
  variant: "covered" | "missed";
  items: string[];
};

/** One list of graded points — what the answer got, or what it left out. */
function FeedbackGroup({ heading, variant, items }: FeedbackProps) {
  if (items.length === 0) return null;

  return (
    <div className="simulation-feedback-group">
      <span
        className={`simulation-feedback-heading simulation-feedback-heading--${variant}`}
      >
        {variant === "covered" ? <CheckIcon /> : <CloseIcon />}
        {heading}
      </span>
      <div className="simulation-chips">
        {items.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key -- grading output: read-only, never reordered, and the strings aren't unique
          <span key={i} className={`simulation-chip simulation-chip--${variant}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

type Props = {
  result: SimulateGradeResult;
  gradingPrompt: string;
  onOpenSave: () => void;
};

/** The score itself, the points it was based on, and the rules that produced it. */
export function GradeScoreSlide({ result, gradingPrompt, onOpenSave }: Props) {
  return (
    <div className="simulation-result-slide">
      <button
        type="button"
        className="simulation-save-btn"
        onClick={onOpenSave}
        title="Save this question to a bank"
      >
        <SaveIcon />
        Save
      </button>
      <div className="simulation-result-grid">
        <div className="simulation-result">
          <div className="simulation-result-header">
            <div className={`simulation-score-badge ${getScoreClass(result.score)}`}>
              <span className="simulation-score-value">{result.score}%</span>
              <span className="simulation-score-label">
                {getScoreLabel(result.score)}
              </span>
            </div>
          </div>
          <div className="simulation-result-feedback">
            <FeedbackGroup heading="Covered" variant="covered" items={result.covered} />
            <FeedbackGroup heading="Missed" variant="missed" items={result.missed} />
          </div>
        </div>
        <div className="simulation-result-prompt">
          <div className="simulation-result-prompt-header">
            <PencilIcon />
            Grading Rules
          </div>
          <div className="simulation-result-prompt-content">
            {gradingPrompt.trim() || "Using built-in default rules"}
          </div>
        </div>
      </div>
    </div>
  );
}
