import "./Sidebar.css";

type View = "dashboard" | "library" | "settings";

type Props = {
  currentView: View;
  onNavigate: (view: View) => void;
  onSimulate?: () => void;
  onGenerateQuestions?: () => void;
  onSettings?: () => void;
};

export function Sidebar({ currentView, onNavigate, onSimulate, onGenerateQuestions, onSettings }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">R</span>
        <span className="sidebar-logo-text">Remaimber</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </span>
          <span className="nav-label">Dashboard</span>
        </button>

        <button
          className={`sidebar-nav-item ${currentView === "library" ? "active" : ""}`}
          onClick={() => onNavigate("library")}
        >
          <span className="nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <span className="nav-label">Library</span>
        </button>

        {onSimulate && (
          <button
            className="sidebar-nav-item"
            onClick={onSimulate}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3h6l2 4H7l2-4z" />
                <path d="M7 7v10a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V7" />
                <path d="M10 11h4" />
              </svg>
            </span>
            <span className="nav-label">Simulate</span>
          </button>
        )}

        {onGenerateQuestions && (
          <button
            className="sidebar-nav-item"
            onClick={onGenerateQuestions}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </span>
            <span className="nav-label">Generate</span>
          </button>
        )}
      </nav>

      <div className="sidebar-footer">
        {onSettings && (
          <button
            className={`sidebar-nav-item sidebar-settings-btn ${currentView === "settings" ? "active" : ""}`}
            onClick={onSettings}
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="nav-label">Settings</span>
          </button>
        )}
        <div className="sidebar-help">
          <span className="help-icon">?</span>
          <span className="help-text">Press ? for shortcuts</span>
        </div>
      </div>
    </aside>
  );
}
