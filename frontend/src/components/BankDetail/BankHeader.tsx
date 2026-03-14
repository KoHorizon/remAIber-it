import type { Bank } from "../../types";
import { getMasteryColor, getBankTypeBadge } from "../../utils/mastery";

type Props = {
  bank: Bank;
  categoryName: string | null;
  questionCount: number;
  isStartingSession: boolean;
  onBack: () => void;
  onAddQuestion: () => void;
  onOpenSessionConfig: () => void;
};

export function BankHeader({
  bank,
  categoryName,
  questionCount,
  isStartingSession,
  onBack,
  onAddQuestion,
  onOpenSessionConfig,
}: Props) {
  const typeBadge = getBankTypeBadge(bank);
  const masteryColor = getMasteryColor(bank.mastery);

  return (
    <div className="bank-header">
      {/* Top row: Back button */}
      <button className="back-btn" onClick={onBack}>
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
          </div>
        </div>

        {/* Actions */}
        <div className="bank-header-actions">
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
