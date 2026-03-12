import "./Sidebar.css";

type View = "dashboard" | "library";

type Props = {
  currentView: View;
  onNavigate: (view: View) => void;
};

export function Sidebar({ currentView, onNavigate }: Props) {
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
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-help">
          <span className="help-icon">?</span>
          <span className="help-text">Press ? for shortcuts</span>
        </div>
      </div>
    </aside>
  );
}
