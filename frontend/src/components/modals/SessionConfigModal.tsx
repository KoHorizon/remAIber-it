import { useState } from "react";
import { Modal, Button } from "../ui";
import "./SessionConfigModal.css";

type Props = {
  totalQuestions: number;
  onStart: (config: {
    maxQuestions?: number;
    maxDurationMin?: number;
    focusOnWeak?: boolean;
  }) => void;
  onCancel: () => void;
};

export function SessionConfigModal({
  totalQuestions,
  onStart,
  onCancel,
}: Props) {
  const [useQuestionLimit, setUseQuestionLimit] = useState(false);
  const [useTimeLimit, setUseTimeLimit] = useState(false);
  const [focusOnWeak, setFocusOnWeak] = useState(false);
  const [maxQuestions, setMaxQuestions] = useState(
    Math.min(20, totalQuestions)
  );
  const [maxDurationMin, setMaxDurationMin] = useState(10);

  function handleStart() {
    onStart({
      maxQuestions: useQuestionLimit ? maxQuestions : undefined,
      maxDurationMin: useTimeLimit ? maxDurationMin : undefined,
      focusOnWeak: focusOnWeak,
    });
  }

  const questionCount = useQuestionLimit ? maxQuestions : totalQuestions;

  return (
    <Modal
      title="Configure Session"
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleStart}>Start Session</Button>
        </>
      }
    >
      <div className="session-config">
        <p className="session-config-subtitle">
          {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} in this bank
        </p>

        <div className="session-config-rows">
          {/* Focus on Weak */}
          <div className={`scr ${focusOnWeak ? "scr--active scr--focus" : ""}`}>
            <div className="scr-main">
              <div className="scr-label-group">
                <span className="scr-label">Focus on weak</span>
                <span className="scr-desc">Prioritize questions with low mastery scores</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={focusOnWeak}
                className={`toggle-switch ${focusOnWeak ? "toggle-switch-on" : ""}`}
                onClick={() => setFocusOnWeak(!focusOnWeak)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Question Limit */}
          <div className={`scr ${useQuestionLimit ? "scr--active" : ""}`}>
            <div className="scr-main">
              <span className="scr-label">Limit questions</span>
              <div className="scr-right">
                {useQuestionLimit && (
                  <div className="scr-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setMaxQuestions((q) => Math.max(1, q - 1))}
                      disabled={maxQuestions <= 1}
                    >−</button>
                    <span className="scr-stepper-value">
                      {maxQuestions}<span className="scr-stepper-total">/{totalQuestions}</span>
                    </span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setMaxQuestions((q) => Math.min(totalQuestions, q + 1))}
                      disabled={maxQuestions >= totalQuestions}
                    >+</button>
                  </div>
                )}
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
            </div>
          </div>

          {/* Time Limit */}
          <div className={`scr ${useTimeLimit ? "scr--active" : ""}`}>
            <div className="scr-main">
              <span className="scr-label">Time limit</span>
              <div className="scr-right">
                {useTimeLimit && (
                  <div className="scr-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setMaxDurationMin((t) => Math.max(1, t - 5))}
                      disabled={maxDurationMin <= 1}
                    >−</button>
                    <span className="scr-stepper-value">
                      {maxDurationMin}<span className="scr-stepper-total"> min</span>
                    </span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setMaxDurationMin((t) => Math.min(120, t + 5))}
                      disabled={maxDurationMin >= 120}
                    >+</button>
                  </div>
                )}
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
            </div>
          </div>
        </div>

        <div className="session-config-summary">
          <span>{questionCount} question{questionCount !== 1 ? "s" : ""}</span>
          <span className="scs-dot" />
          <span>{useTimeLimit ? `${maxDurationMin} min` : "No time limit"}</span>
          {focusOnWeak && (
            <>
              <span className="scs-dot" />
              <span className="scs-focus">Weak focus</span>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
