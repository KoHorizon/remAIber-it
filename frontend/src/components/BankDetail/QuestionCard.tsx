import type { Question, BankType } from "../../types";
import { getMasteryColor, getMasteryLabel } from "../../utils/mastery";
import { renderFormattedText } from "../../utils/formatText";
import { CodeEditor } from "../CodeEditor";
import { TerminalDisplay } from "../TerminalDisplay";

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

  return (
    <div
      className="question-card card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="question-header">
        <span className="question-number">Q{index + 1}</span>
        <div className={`question-mastery ${getMasteryColor(question.mastery)}`}>
          <span className="mastery-percent">{question.mastery}%</span>
          <span className="mastery-status">{getMasteryLabel(question.mastery)}</span>
        </div>
      </div>
      <div className="question-content">
        {isCodeMode ? (
          <div className="question-subject-formatted">
            {renderFormattedText(question.subject)}
          </div>
        ) : (
          <p className="question-subject">{question.subject}</p>
        )}
        {question.expected_answer && (
          <>
            {bankType === "cli" ? (
              <div
                className={`code-answer ${isExpanded ? "expanded" : ""}`}
                onClick={shouldCollapse ? onToggleExpand : undefined}
              >
                <TerminalDisplay
                  value={question.expected_answer}
                  expanded={isExpanded || !shouldCollapse}
                  maxLines={15}
                />
                {shouldCollapse && (
                  <span className="code-expand-hint">
                    {isExpanded
                      ? "Click to collapse"
                      : `Click to expand (${lines.length} lines)`}
                  </span>
                )}
              </div>
            ) : bankType === "code" ? (
              <div
                className={`code-answer ${isExpanded ? "expanded" : ""}`}
                onClick={shouldCollapse ? onToggleExpand : undefined}
              >
                <CodeEditor
                  value={displayedAnswer || ""}
                  onChange={() => {}}
                  language={bankLanguage || "plaintext"}
                  height={
                    shouldCollapse && !isExpanded
                      ? "350px"
                      : `${lines.length * 22 + 24}px`
                  }
                  readOnly={true}
                />
                {shouldCollapse && (
                  <span className="code-expand-hint">
                    {isExpanded
                      ? "Click to collapse"
                      : `Click to expand (${lines.length} lines)`}
                  </span>
                )}
              </div>
            ) : (
              <p className="question-answer">{question.expected_answer}</p>
            )}
          </>
        )}
      </div>
      <div className="question-stats">
        <span className="stat">
          <span className="stat-value">{question.times_answered}</span>
          <span className="stat-label">attempts</span>
        </span>
        <span className="stat">
          <span className="stat-value">{question.times_correct}</span>
          <span className="stat-label">correct</span>
        </span>
        {question.times_answered > 0 && (
          <span className="stat">
            <span className="stat-value">
              {Math.round((question.times_correct / question.times_answered) * 100)}%
            </span>
            <span className="stat-label">success rate</span>
          </span>
        )}
      </div>
      <button
        className="btn-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete question"
      >
        x
      </button>
    </div>
  );
}
