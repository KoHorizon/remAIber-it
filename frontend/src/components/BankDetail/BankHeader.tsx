import type { Bank } from "../../types";
import { getMasteryColor, getBankTypeBadge } from "../../utils/mastery";
import { Tooltip, TooltipTitle, TooltipContent, TooltipHint } from "../ui";

type Props = {
  bank: Bank;
  categoryName: string | null;
  questionCount: number;
  isStartingSession: boolean;
  onBack: () => void;
  onAddQuestion: () => void;
  onOpenGradingSettings: () => void;
  onOpenSessionConfig: () => void;
};

export function BankHeader({
  bank,
  categoryName,
  questionCount,
  isStartingSession,
  onBack,
  onAddQuestion,
  onOpenGradingSettings,
  onOpenSessionConfig,
}: Props) {
  const typeBadge = getBankTypeBadge(bank);
  const masteryColor = getMasteryColor(bank.mastery);

  return (
    <div className="bank-header">
      {/* Top row: Back button */}
      <button className="btn btn-ghost btn-sm back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Main header content */}
      <div className="bank-header-main">
        <div className="bank-header-left">
          {/* Category breadcrumb */}
          {categoryName && (
            <span className="bank-breadcrumb">{categoryName}</span>
          )}

          {/* Bank title with type badge */}
          <div className="bank-title-row">
            <h1 className="bank-title">{bank.subject}</h1>
            <span className={`bank-type-pill ${typeBadge.className}`}>
              <span className="pill-icon">{typeBadge.icon}</span>
              {typeBadge.label}
            </span>
          </div>

          {/* Stats row */}
          <div className="bank-stats-row">
            <div className="bank-stat">
              <span className="bank-stat-value">{questionCount}</span>
              <span className="bank-stat-label">
                {questionCount === 1 ? "Question" : "Questions"}
              </span>
            </div>
            <div className="bank-stat-divider" />
            {bank.mastery > 0 ? (
              <div className="bank-stat">
                <span className={`bank-stat-value ${masteryColor}`}>{bank.mastery}%</span>
                <span className="bank-stat-label">Mastery</span>
              </div>
            ) : (
              <div className="bank-stat bank-stat-muted">
                <span className="bank-stat-label">Not practiced yet</span>
              </div>
            )}
            {bank.grading_prompt && (
              <>
                <div className="bank-stat-divider" />
                <Tooltip
                  trigger={
                    <div className="bank-stat bank-stat-clickable" onClick={onOpenGradingSettings}>
                      <span className="bank-stat-value bank-stat-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </span>
                      <span className="bank-stat-label">Custom Grading</span>
                    </div>
                  }
                  width="360px"
                >
                  <TooltipTitle>Grading Rules</TooltipTitle>
                  <TooltipContent>{bank.grading_prompt}</TooltipContent>
                  <TooltipHint>Click to edit</TooltipHint>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bank-header-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={onOpenGradingSettings}
            title="Grading Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="btn btn-secondary" onClick={onAddQuestion}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Question
          </button>
          <button
            className="btn btn-primary"
            onClick={onOpenSessionConfig}
            disabled={questionCount === 0 || isStartingSession}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {isStartingSession ? "Starting..." : "Practice"}
          </button>
        </div>
      </div>
    </div>
  );
}
