export function CompletingScreen() {
  return (
    <div className="practice-completing animate-fade-in">
      <div className="completing-content">
        <div className="completing-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <p className="completing-title">Grading your answers</p>
        <p className="completing-subtitle">Analysing each response against the expected answers…</p>
        <div className="completing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}
