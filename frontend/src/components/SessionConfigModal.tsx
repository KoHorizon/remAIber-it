import { useState } from "react";
import "./SessionConfigModal.css";

type Props = {
  totalQuestions: number;
  onStart: (config: { maxQuestions?: number; maxDurationMin?: number }) => void;
  onCancel: () => void;
};

export function SessionConfigModal({
  totalQuestions,
  onStart,
  onCancel,
}: Props) {
  const [useQuestionLimit, setUseQuestionLimit] = useState(false);
  const [useTimeLimit, setUseTimeLimit] = useState(false);
  const [maxQuestions, setMaxQuestions] = useState(
    Math.min(20, totalQuestions),
  );
  const [maxDurationMin, setMaxDurationMin] = useState(10);

  function handleStart() {
    onStart({
      maxQuestions: useQuestionLimit ? maxQuestions : undefined,
      maxDurationMin: useTimeLimit ? maxDurationMin : undefined,
    });
  }

  function handleQuestionChange(value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setMaxQuestions(Math.max(1, Math.min(num, totalQuestions)));
    }
  }

  function handleTimeChange(value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setMaxDurationMin(Math.max(1, Math.min(num, 120)));
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content session-config-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Configure Session</h2>
        <p className="modal-subtitle">
          {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} in this
          bank
        </p>

        <div className="config-options">
          {/* Question Limit */}
          <div
            className={`config-option ${useQuestionLimit ? "config-option-active" : ""}`}
          >
            <div className="config-header">
              <span className="config-label">Limit questions</span>
              <button
                type="button"
                role="switch"
                aria-checked={useQuestionLimit}
                className={`toggle-switch ${useQuestionLimit ? "toggle-switch-on" : ""}`}
                onClick={() => setUseQuestionLimit(!useQuestionLimit)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
            {useQuestionLimit && (
              <div className="config-input-row">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setMaxQuestions((q) => Math.max(1, q - 1))}
                  disabled={maxQuestions <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  className="config-number-input"
                  value={maxQuestions}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  min={1}
                  max={totalQuestions}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() =>
                    setMaxQuestions((q) => Math.min(totalQuestions, q + 1))
                  }
                  disabled={maxQuestions >= totalQuestions}
                >
                  +
                </button>
                <span className="config-unit">/ {totalQuestions}</span>
              </div>
            )}
          </div>

          {/* Time Limit */}
          <div
            className={`config-option ${useTimeLimit ? "config-option-active" : ""}`}
          >
            <div className="config-header">
              <span className="config-label">Time limit</span>
              <button
                type="button"
                role="switch"
                aria-checked={useTimeLimit}
                className={`toggle-switch ${useTimeLimit ? "toggle-switch-on" : ""}`}
                onClick={() => setUseTimeLimit(!useTimeLimit)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
            {useTimeLimit && (
              <div className="config-input-row">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setMaxDurationMin((t) => Math.max(1, t - 5))}
                  disabled={maxDurationMin <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  className="config-number-input"
                  value={maxDurationMin}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  min={1}
                  max={120}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setMaxDurationMin((t) => Math.min(120, t + 5))}
                  disabled={maxDurationMin >= 120}
                >
                  +
                </button>
                <span className="config-unit">min</span>
              </div>
            )}
          </div>
        </div>

        <div className="config-summary">
          {useQuestionLimit ? maxQuestions : totalQuestions} question
          {(useQuestionLimit ? maxQuestions : totalQuestions) !== 1 ? "s" : ""}
          {useTimeLimit ? ` · ${maxDurationMin} min` : " · No time limit"}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleStart}>
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
