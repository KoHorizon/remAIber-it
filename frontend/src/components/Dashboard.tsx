import { useLibraryData } from "../context";
import { getMasteryLevel } from "../utils/mastery";
import "./Dashboard.css";

type Props = {
  onSelectBank: (bankId: string) => void;
  onQuickPractice: (bankIds: string[]) => void;
};

export function Dashboard({ onSelectBank, onQuickPractice }: Props) {
  const { categories, banks, isLoading, getCategoryName } = useLibraryData();

  // Calculate stats
  const totalQuestions = banks.reduce(
    (sum, b) => sum + (b.question_count ?? 0),
    0
  );

  const overallMastery = banks.length > 0
    ? Math.round(banks.reduce((sum, b) => sum + b.mastery, 0) / banks.length)
    : 0;

  // Banks that need attention (mastery < 50%)
  const needsAttention = banks
    .filter((b) => b.mastery < 50 && (b.question_count ?? 0) > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5);

  // Recent / in progress (has some mastery)
  const recentBanks = banks
    .filter((b) => b.mastery > 0)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5);

  // Banks with questions for quick practice
  const practiceableBanks = banks.filter((b) => (b.question_count ?? 0) > 0);

  function handleQuickPractice() {
    if (needsAttention.length > 0) {
      onQuickPractice(needsAttention.map((b) => b.id));
    } else if (practiceableBanks.length > 0) {
      onQuickPractice([practiceableBanks[0].id]);
    }
  }

  // Progress ring calculation
  const circumference = 2 * Math.PI * 28; // radius = 28
  const strokeDashoffset = circumference - (overallMastery / 100) * circumference;

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );
  }

  const hasContent = banks.length > 0;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-greeting">Overview</h1>
        <p className="dashboard-subtitle">
          {hasContent
            ? `You have ${banks.length} question bank${banks.length !== 1 ? "s" : ""} with ${totalQuestions} questions`
            : "Get started by creating your first question bank"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Overall Mastery with ring */}
        <div className="stat-card">
          <div className="stat-card-mastery">
            <div className="mastery-ring-container">
              <svg className="mastery-ring" width="72" height="72" viewBox="0 0 72 72">
                <circle
                  className="mastery-ring-bg"
                  cx="36"
                  cy="36"
                  r="28"
                />
                <circle
                  className={`mastery-ring-fill ${getMasteryLevel(overallMastery)}`}
                  cx="36"
                  cy="36"
                  r="28"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <span className="mastery-ring-value">{overallMastery}%</span>
            </div>
            <div className="stat-card-info">
              <div className="stat-card-label">Overall Mastery</div>
              <div className="stat-card-sub">
                {overallMastery >= 70 ? "Great progress!" : overallMastery > 0 ? "Keep practicing" : "Start learning"}
              </div>
            </div>
          </div>
        </div>

        {/* Question Banks */}
        <div className="stat-card">
          <div className="stat-card-label">Question Banks</div>
          <div className="stat-card-value">{banks.length}</div>
          <div className="stat-card-sub">{practiceableBanks.length} with questions</div>
        </div>

        {/* Total Questions */}
        <div className="stat-card">
          <div className="stat-card-label">Total Questions</div>
          <div className="stat-card-value">{totalQuestions}</div>
          <div className="stat-card-sub">across all banks</div>
        </div>

        {/* Categories */}
        <div className="stat-card">
          <div className="stat-card-label">Categories</div>
          <div className="stat-card-value">{categories.length}</div>
          <div className="stat-card-sub">for organization</div>
        </div>
      </div>

      {/* Quick Practice */}
      {hasContent && (
        <div className="quick-practice-section">
          <button
            className="quick-practice-btn"
            onClick={handleQuickPractice}
            disabled={practiceableBanks.length === 0}
          >
            <div className="quick-practice-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div className="quick-practice-content">
              <div className="quick-practice-title">Quick Practice</div>
              <div className="quick-practice-desc">
                {needsAttention.length > 0
                  ? `Review ${needsAttention.length} weak bank${needsAttention.length !== 1 ? "s" : ""}`
                  : practiceableBanks.length > 0
                    ? "Start a practice session"
                    : "Add questions to get started"}
              </div>
            </div>
            <div className="quick-practice-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Content Sections */}
      {hasContent && (
        <div className="dashboard-sections">
          {/* Needs Attention */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                Needs Review
              </h2>
              {needsAttention.length > 0 && (
                <span className="section-count">{needsAttention.length}</span>
              )}
            </div>
            {needsAttention.length > 0 ? (
              <div className="bank-list">
                {needsAttention.map((bank) => (
                  <button
                    key={bank.id}
                    className="bank-item"
                    onClick={() => onSelectBank(bank.id)}
                  >
                    <div className="bank-item-info">
                      <div className="bank-item-name">{bank.subject}</div>
                      <div className="bank-item-meta">
                        {getCategoryName(bank.category_id)}
                      </div>
                    </div>
                    <span className={`bank-item-mastery ${getMasteryLevel(bank.mastery)}`}>
                      {bank.mastery}%
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="section-empty">
                All caught up! No banks need review.
              </div>
            )}
          </div>

          {/* Continue Learning */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                In Progress
              </h2>
            </div>
            {recentBanks.length > 0 ? (
              <div className="bank-list">
                {recentBanks.map((bank) => (
                  <button
                    key={bank.id}
                    className="bank-item"
                    onClick={() => onSelectBank(bank.id)}
                  >
                    <div className="bank-item-info">
                      <div className="bank-item-name">{bank.subject}</div>
                      <div className="bank-item-meta">
                        {getCategoryName(bank.category_id)}
                      </div>
                    </div>
                    <span className={`bank-item-mastery ${getMasteryLevel(bank.mastery)}`}>
                      {bank.mastery}%
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="section-empty">
                Practice some banks to see your progress here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasContent && (
        <div className="dashboard-empty">
          <div className="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="6" x2="12" y2="12" />
              <line x1="9" y1="9" x2="15" y2="9" />
            </svg>
          </div>
          <h2 className="empty-title">Welcome to Remaimber</h2>
          <p className="empty-text">
            Create your first category and question bank to start practicing and tracking your learning.
          </p>
          <p className="empty-action">
            <span style={{ color: "var(--text-muted)" }}>Go to</span>
            <strong style={{ color: "var(--accent)" }}>Library</strong>
            <span style={{ color: "var(--text-muted)" }}>to get started</span>
          </p>
        </div>
      )}
    </div>
  );
}
