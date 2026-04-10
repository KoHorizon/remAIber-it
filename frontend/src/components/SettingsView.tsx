import { useTheme } from "../context";
import "./SettingsView.css";

export function SettingsView() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="settings-view animate-fade-in">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Customize your experience</p>
      </div>

      <div className="settings-body">
        <div className="settings-section card">
          <h3>Appearance</h3>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Dark Mode</span>
              <span className="settings-row-description">
                Switch to a darker color scheme
              </span>
            </div>
            <button
              className={`theme-toggle ${theme === "dark" ? "active" : ""}`}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              role="switch"
              aria-checked={theme === "dark"}
            >
              <span className="theme-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
