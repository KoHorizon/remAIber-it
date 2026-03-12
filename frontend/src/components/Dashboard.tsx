import { useState, useEffect } from "react";
import { api } from "../api";
import type { Bank, Category } from "../types";
import { getMasteryColor } from "../utils/mastery";
import "./Dashboard.css";

type Props = {
  onSelectBank: (bankId: string) => void;
  onQuickPractice: (bankIds: string[]) => void;
};

export function Dashboard({ onSelectBank, onQuickPractice }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesData, banksData] = await Promise.all([
        api.getCategories(),
        api.getBanks(),
      ]);
      setCategories(categoriesData || []);
      setBanks(banksData || []);
    } catch (err: unknown) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate stats
  const totalQuestions = banks.reduce(
    (sum, b) => sum + (b.questions?.length || 0),
    0
  );

  const overallMastery = banks.length > 0
    ? Math.round(banks.reduce((sum, b) => sum + b.mastery, 0) / banks.length)
    : 0;

  // Get weak banks (mastery < 50%)
  const weakBanks = banks
    .filter((b) => b.mastery < 50 && (b.questions?.length || 0) > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);

  // Get banks with questions for quick practice
  const practiceableBanks = banks.filter((b) => (b.questions?.length || 0) > 0);

  // Get recently practiced (from localStorage or just show banks with progress)
  const recentBanks = banks
    .filter((b) => b.mastery > 0)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 4);

  function handleQuickPractice() {
    if (weakBanks.length > 0) {
      onQuickPractice(weakBanks.map((b) => b.id));
    } else if (practiceableBanks.length > 0) {
      onQuickPractice([practiceableBanks[0].id]);
    }
  }

  function getCategoryName(categoryId: string | null | undefined): string {
    if (!categoryId) return "";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "";
  }

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
      {/* Stats Row */}
      <div className="dashboard-stats">
        <div className="stat-card stat-card-primary">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{overallMastery}%</span>
            <span className="stat-card-label">Overall Mastery</span>
          </div>
          <div className={`stat-card-ring ${getMasteryColor(overallMastery)}`} />
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{banks.length}</span>
            <span className="stat-card-label">Question Banks</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{totalQuestions}</span>
            <span className="stat-card-label">Total Questions</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-card-content">
            <span className="stat-card-value">{categories.length}</span>
            <span className="stat-card-label">Categories</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {hasContent && (
        <div className="dashboard-quick-actions">
          <button
            className="quick-action-btn quick-action-primary"
            onClick={handleQuickPractice}
            disabled={practiceableBanks.length === 0}
          >
            <span className="quick-action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </span>
            <span className="quick-action-text">
              <span className="quick-action-title">Quick Practice</span>
              <span className="quick-action-desc">
                {weakBanks.length > 0
                  ? `Focus on ${weakBanks.length} weak area${weakBanks.length !== 1 ? "s" : ""}`
                  : "Start a random session"}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Weak Areas */}
        {weakBanks.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon section-icon-warning">!</span>
                Needs Attention
              </h2>
              <span className="section-badge">{weakBanks.length}</span>
            </div>
            <div className="bank-list">
              {weakBanks.map((bank) => (
                <button
                  key={bank.id}
                  className="bank-list-item"
                  onClick={() => onSelectBank(bank.id)}
                >
                  <div className="bank-list-info">
                    <span className="bank-list-name">{bank.subject}</span>
                    <span className="bank-list-category">
                      {getCategoryName(bank.category_id)}
                    </span>
                  </div>
                  <div className={`bank-list-mastery ${getMasteryColor(bank.mastery)}`}>
                    {bank.mastery}%
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent / In Progress */}
        {recentBanks.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon section-icon-accent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                Continue Learning
              </h2>
            </div>
            <div className="bank-list">
              {recentBanks.map((bank) => (
                <button
                  key={bank.id}
                  className="bank-list-item"
                  onClick={() => onSelectBank(bank.id)}
                >
                  <div className="bank-list-info">
                    <span className="bank-list-name">{bank.subject}</span>
                    <span className="bank-list-category">
                      {getCategoryName(bank.category_id)}
                    </span>
                  </div>
                  <div className={`bank-list-mastery ${getMasteryColor(bank.mastery)}`}>
                    {bank.mastery}%
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Empty State */}
      {!hasContent && (
        <div className="dashboard-empty">
          <div className="empty-illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="50" stroke="var(--border)" strokeWidth="2" strokeDasharray="8 4" />
              <path d="M60 30v30l20 10" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="60" cy="60" r="5" fill="var(--accent)" />
            </svg>
          </div>
          <h2 className="empty-title">Welcome to Remaimber</h2>
          <p className="empty-text">
            Create your first question bank to start practicing and tracking your learning progress.
          </p>
          <p className="empty-hint">
            Go to <strong>Library</strong> to create categories and question banks.
          </p>
        </div>
      )}
    </div>
  );
}
