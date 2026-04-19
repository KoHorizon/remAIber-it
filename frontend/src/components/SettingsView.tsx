import { useTheme, THEMES } from "../context";
import "./SettingsView.css";

export function SettingsView() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-view animate-fade-in">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Customize your experience</p>
      </div>

      <div className="settings-body">
        <div className="settings-section card">
          <h3>Appearance</h3>

          <div className="settings-row settings-row--block">
            <div className="settings-row-info">
              <span className="settings-row-label">Theme</span>
              <span className="settings-row-description">
                Choose a color theme for the interface
              </span>
            </div>
            <div className="theme-picker">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-swatch ${theme === t.id ? "active" : ""}`}
                  onClick={() => setTheme(t.id)}
                  aria-label={`${t.label} theme`}
                  title={t.label}
                  style={{ "--swatch-bg": t.bg, "--swatch-accent": t.accent } as React.CSSProperties}
                >
                  <span className="theme-swatch-preview">
                    <span className="theme-swatch-bg" />
                    <span className="theme-swatch-dot" />
                  </span>
                  <span className="theme-swatch-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
