import type { Question, BankType } from "../../types";
import { getMasteryColor, getMasteryLabel } from "../../utils/mastery";
import { renderFormattedText } from "../../utils/formatText";
import { CodeEditor } from "../CodeEditor";
import { TerminalDisplay } from "../TerminalDisplay";
import { Tooltip, TooltipTitle, TooltipContent } from "../ui";
import "./QuestionCard.css";

type Props = {
  question: Question;
  index: number;
  bankType: BankType;
  bankLanguage?: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
};

export function QuestionCard({
  question,
  index,
  bankType,
  bankLanguage,
  isExpanded,
  onToggleExpand,
  onDelete,
}: Props) {
  const isCodeMode = bankType === "code" || bankType === "cli";
  const lines = question.expected_answer?.split("\n") || [];
  const shouldCollapse = isCodeMode && lines.length > 15;
  const displayedAnswer =
    shouldCollapse && !isExpanded
      ? lines.slice(0, 15).join("\n") + "\n..."
      : question.expected_answer;

  const successRate = question.times_answered > 0
    ? Math.round((question.times_correct / question.times_answered) * 100)
    : 0;

  return (
    <div
      className="qcard"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Header */}
      <div className="qcard-header">
        <div className="qcard-header-left">
          <span className="qcard-number">Q{index + 1}</span>
          {question.grading_prompt && (
            <Tooltip
              trigger={
                <span className="qcard-grading-badge qcard-grading-badge--custom">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Grading rules
                </span>
              }
              width="400px"
            >
              <TooltipTitle>Grading Rules</TooltipTitle>
              <TooltipContent>{question.grading_prompt}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={`qcard-mastery ${getMasteryColor(question.mastery)}`}>
          {question.mastery > 0 && <span className="qcard-mastery-value">{question.mastery}%</span>}
          <span className="qcard-mastery-label">{getMasteryLabel(question.mastery)}</span>
        </div>
      </div>

      {/* Question text */}
      <div className="qcard-question">
        {isCodeMode ? (
          <div className="qcard-question-formatted">
            {renderFormattedText(question.subject)}
          </div>
        ) : (
          <p className="qcard-question-text">{question.subject}</p>
        )}
      </div>

      {/* Expected answer */}
      {question.expected_answer && (
        <div className="qcard-answer">
          {bankType === "cli" ? (
            <div
              className={`qcard-code-block ${isExpanded ? "expanded" : ""}`}
              onClick={shouldCollapse ? onToggleExpand : undefined}
            >
              <TerminalDisplay
                value={question.expected_answer}
                expanded={isExpanded || !shouldCollapse}
                maxLines={15}
              />
              {shouldCollapse && (
                <span className="qcard-expand-hint">
                  {isExpanded ? "Click to collapse" : `Click to expand (${lines.length} lines)`}
                </span>
              )}
            </div>
          ) : bankType === "code" ? (
            <div
              className={`qcard-code-block ${isExpanded ? "expanded" : ""}`}
              onClick={shouldCollapse ? onToggleExpand : undefined}
            >
              <CodeEditor
                value={displayedAnswer || ""}
                onChange={() => {}}
                language={bankLanguage || "plaintext"}
                height={shouldCollapse && !isExpanded ? "350px" : `${lines.length * 22 + 24}px`}
                readOnly={true}
              />
              {shouldCollapse && (
                <span className="qcard-expand-hint">
                  {isExpanded ? "Click to collapse" : `Click to expand (${lines.length} lines)`}
                </span>
              )}
            </div>
          ) : (
            <p className="qcard-answer-text">{question.expected_answer}</p>
          )}
        </div>
      )}

      {/* Footer with stats */}
      <div className="qcard-footer">
        <div className="qcard-stats">
          <div className="qcard-stat">
            <span className="qcard-stat-value">{question.times_answered}</span>
            <span className="qcard-stat-label">Attempts</span>
          </div>
          <div className="qcard-stat">
            <span className="qcard-stat-value">{question.times_correct}</span>
            <span className="qcard-stat-label">Correct</span>
          </div>
          {question.times_answered > 0 && (
            <div className="qcard-stat">
              <span className="qcard-stat-value">{successRate}%</span>
              <span className="qcard-stat-label">Success</span>
            </div>
          )}
        </div>
        <button
          className="qcard-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete question"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
