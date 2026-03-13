import type { Bank, BankType } from "../../types";
import { getMasteryColor, getBankTypeBadge } from "../../utils/mastery";

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

  return (
    <div className="page-header">
      <button className="btn btn-ghost back-btn" onClick={onBack}>
        &larr; Back
      </button>
      <div className="bank-header-info">
        {categoryName && <span className="bank-category">{categoryName}</span>}
        <h1>{bank.subject}</h1>
        <div className="bank-meta">
          <span className="page-subtitle">
            {questionCount === 0
              ? "No questions yet"
              : `${questionCount} question${questionCount !== 1 ? "s" : ""}`}
          </span>
          <div className={`bank-mastery-badge ${getMasteryColor(bank.mastery)}`}>
            <span className="mastery-value">{bank.mastery}%</span>
            <span className="mastery-label">overall mastery</span>
          </div>
          <span className={`bank-type-badge ${typeBadge.className}`}>
            <span className="badge-icon">{typeBadge.icon}</span>
            <span className="badge-label">{typeBadge.label}</span>
          </span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="btn btn-ghost"
          onClick={onOpenGradingSettings}
          title="Grading Settings"
        >
          Grading
        </button>
        <button className="btn btn-secondary" onClick={onAddQuestion}>
          + Add Question
        </button>
        <button
          className="btn btn-primary"
          onClick={onOpenSessionConfig}
          disabled={questionCount === 0 || isStartingSession}
        >
          {isStartingSession ? "Starting..." : "Practice"}
        </button>
      </div>
    </div>
  );
}
