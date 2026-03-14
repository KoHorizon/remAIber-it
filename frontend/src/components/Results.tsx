import { useState } from "react";
import type { SessionResult, BankType } from "../types";
import { renderFormattedText } from "../utils/formatText";
import { CodeEditor } from "./CodeEditor";
import { TerminalDisplay } from "./TerminalDisplay";
import { Button, Tooltip, TooltipTitle, TooltipContent, TooltipHint } from "./ui";
import "./Results.css";

type ResultQuestion = {
  id: string;
  subject: string;
  expected_answer?: string;
  grading_prompt?: string | null;
};

type Props = {
  results: SessionResult;
  questions: ResultQuestion[];
  bankSubject: string;
  bankType?: BankType;
  bankLanguage?: string | null;
  onBack: () => void;
  onRetry: () => void;
};

export function Results({
  results,
  questions,
  bankSubject,
  bankType = "theory",
  bankLanguage,
  onBack,
  onRetry,
}: Props) {
  // null = use score-based default; true/false = user explicitly toggled
  const [answerOverrides, setAnswerOverrides] = useState<Map<number, boolean>>(new Map());

  const isCodeMode = bankType === "code" || bankType === "cli";

  const hasAnswers = results.max_score > 0;
  const percentage = hasAnswers
    ? Math.round((results.total_score / results.max_score) * 100)
    : 0;

  const totalQuestions = results.results.length;
  const answeredCount = results.results.filter(r => r.user_answer && r.user_answer.trim() !== "").length;
  const skippedCount = totalQuestions - answeredCount;
  const perfectCount = results.results.filter(r => Math.round(r.score) >= 90).length;

  const toggleAnswer = (index: number, currentlyShown: boolean) => {
    setAnswerOverrides((prev) => new Map(prev).set(index, !currentlyShown));
  };

  const getScoreClass = (pct = percentage) => {
    if (!hasAnswers) return "score-poor";
    if (pct >= 90) return "score-excellent";
    if (pct >= 70) return "score-good";
    if (pct >= 50) return "score-needs-work";
    return "score-poor";
  };

  const getScoreLabel = () => {
    if (!hasAnswers) return "No answers";
    if (percentage >= 90) return "Excellent";
    if (percentage >= 70) return "Good job";
    if (percentage >= 50) return "Keep going";
    return "Needs work";
  };

  const getMessage = () => {
    if (!hasAnswers) return "Time ran out before you could answer any questions.";
    if (percentage >= 90) return "You have a strong grasp of this material.";
    if (percentage >= 70) return "Keep practicing to reinforce your knowledge.";
    if (percentage >= 50) return "Review the missed concepts and try again.";
    return "Focus on the concepts you missed.";
  };

  return (
    <div className={`results-page animate-fade-in ${isCodeMode ? "results-code-mode" : ""}`}>
      {/* Sidebar */}
      <aside className="results-sidebar">
        <div className="results-sidebar-header">
          <button className="back-btn" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        <div className="results-sidebar-content">
          <div className="results-sidebar-section">
            <span className="results-sidebar-label">Subject</span>
            <h3 className="results-sidebar-title">{bankSubject}</h3>
          </div>

          {/* Score hero */}
          <div className={`results-score-hero ${getScoreClass()}`}>
            <div className="results-score-ring">
              <span className="results-score-pct">{percentage}%</span>
              <span className="results-score-sublabel">{getScoreLabel()}</span>
            </div>
            <p className="results-score-message">{getMessage()}</p>
          </div>

          {/* Stats */}
          <div className="results-sidebar-section">
            <span className="results-sidebar-label">Session stats</span>
            <div className="results-stats-grid">
              <div className="results-stat-item">
                <span className="results-stat-value">{answeredCount}</span>
                <span className="results-stat-label">Answered</span>
              </div>
              <div className="results-stat-item">
                <span className="results-stat-value">{skippedCount}</span>
                <span className="results-stat-label">Skipped</span>
              </div>
              <div className="results-stat-item">
                <span className="results-stat-value results-stat-perfect">{perfectCount}</span>
                <span className="results-stat-label">Perfect</span>
              </div>
              <div className="results-stat-item">
                <span className="results-stat-value">{totalQuestions}</span>
                <span className="results-stat-label">Total</span>
              </div>
            </div>
          </div>

          <div className="results-sidebar-actions">
            <Button variant="primary" className="btn-full" onClick={onRetry}>
              Retry Questions
            </Button>
            <Button variant="secondary" className="btn-full" onClick={onBack}>
              Back to Home
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="results-main">
        <div className="results-main-header">
          <h2>Question Breakdown</h2>
          <span className="results-main-subtitle">{totalQuestions} question{totalQuestions !== 1 ? "s" : ""}</span>
        </div>

        {!hasAnswers ? (
          <div className="results-empty">
            <p>No questions were answered in this session.</p>
          </div>
        ) : (
          <div className="results-breakdown-list">
            {results.results.map((result, i) => {
              const question = questions[i];
              const questionScore = Math.round(result.score);
              const override = answerOverrides.get(i);
              const isExpanded = override !== undefined ? override : undefined;
              const hasExpectedAnswer = !!question?.expected_answer;
              const hasUserAnswer = !!(result.user_answer && result.user_answer.trim() !== "");
              const scoreClass = getScoreClass(questionScore);
              const gradingPrompt = question?.grading_prompt;

              const gradingTooltip = (
                <Tooltip
                  trigger={
                    <span className={`bcard-score-pill bcard-score-pill--clickable ${scoreClass}`}>
                      {questionScore}%
                    </span>
                  }
                  position="bottom"
                  width="360px"
                >
                  <TooltipTitle>Grading Rules</TooltipTitle>
                  {gradingPrompt
                    ? <TooltipContent>{gradingPrompt}</TooltipContent>
                    : <TooltipHint>No custom rules set — built-in defaults were used.</TooltipHint>
                  }
                </Tooltip>
              );

              // ── Code / CLI card ─────────────────────────────────────────
              if (isCodeMode) {
                return (
                  <div
                    key={question?.id ?? i}
                    className={`breakdown-card breakdown-card-code ${scoreClass}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {/* Header row */}
                    <div className="bcard-header">
                      <span className="bcard-num">Q{i + 1}</span>
                      <div className="bcard-header-mid">
                        <div className="breakdown-question-content">
                          {renderFormattedText(question?.subject || "")}
                        </div>
                      </div>
                      {gradingTooltip}
                    </div>

                    {/* Diff-style answer block */}
                    <div className="bcard-diff">
                      {/* Your answer */}
                      <div className={`bcard-diff-pane bcard-diff-yours ${!hasUserAnswer ? "bcard-diff-empty" : ""}`}>
                        <div className="bcard-diff-label">
                          <span className={`bcard-diff-dot ${scoreClass}`} />
                          Your answer
                        </div>
                        <div className="bcard-diff-content">
                          {hasUserAnswer ? (
                            bankType === "cli" ? (
                              <TerminalDisplay value={result.user_answer} expanded={true} />
                            ) : (
                              <CodeEditor
                                value={result.user_answer}
                                onChange={() => {}}
                                language={bankLanguage || "plaintext"}
                                readOnly={true}
                              />
                            )
                          ) : (
                            <div className="bcard-not-answered">Not answered</div>
                          )}
                        </div>
                      </div>

                      <div className="bcard-diff-divider" />

                      {/* Expected answer */}
                      <div className="bcard-diff-pane bcard-diff-expected">
                        <div className="bcard-diff-label">
                          <span className="bcard-diff-dot score-excellent" />
                          Expected answer
                        </div>
                        <div className="bcard-diff-content">
                          {hasExpectedAnswer ? (
                            bankType === "cli" ? (
                              <TerminalDisplay value={question.expected_answer || ""} expanded={true} />
                            ) : (
                              <CodeEditor
                                value={question.expected_answer || ""}
                                onChange={() => {}}
                                language={bankLanguage || "plaintext"}
                                readOnly={true}
                              />
                            )
                          ) : (
                            <div className="bcard-not-answered">No expected answer</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline feedback chips */}
                    {(result.covered.length > 0 || result.missed.length > 0) && (
                      <div className="bcard-feedback">
                        {result.covered.length > 0 && (
                          <div className="bcard-feedback-group">
                            <span className="bcard-feedback-heading bcard-feedback-heading--covered">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              Covered
                            </span>
                            <div className="bcard-chips">
                              {result.covered.map((item, j) => (
                                <span key={j} className="bcard-chip bcard-chip--covered">{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.missed.length > 0 && (
                          <div className="bcard-feedback-group">
                            <span className="bcard-feedback-heading bcard-feedback-heading--missed">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Missed
                            </span>
                            <div className="bcard-chips">
                              {result.missed.map((item, j) => (
                                <span key={j} className="bcard-chip bcard-chip--missed">{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Theory card ──────────────────────────────────────────────
              // Default: expanded when score < 70; user toggle overrides
              const showAnswers = isExpanded !== undefined ? isExpanded : questionScore < 70;
              const missedItems = hasUserAnswer ? result.missed : [];
              const hasFeedback = result.covered.length > 0 || missedItems.length > 0;

              return (
                <div
                  key={question?.id ?? i}
                  className={`breakdown-card ${scoreClass}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Header */}
                  <div className="bcard-header">
                    <span className="bcard-num">Q{i + 1}</span>
                    <div className="breakdown-question">
                      {renderFormattedText(question?.subject || "")}
                    </div>
                    {!hasUserAnswer && <span className="bcard-skipped-badge">Skipped</span>}
                    {gradingTooltip}
                  </div>

                  {/* Feedback chips — always visible */}
                  {hasFeedback && (
                    <div className="bcard-feedback">
                      {result.covered.length > 0 && (
                        <div className="bcard-feedback-group">
                          <span className="bcard-feedback-heading bcard-feedback-heading--covered">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Covered
                          </span>
                          <div className="bcard-chips">
                            {result.covered.map((item, j) => (
                              <span key={j} className="bcard-chip bcard-chip--covered">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {missedItems.length > 0 && (
                        <div className="bcard-feedback-group">
                          <span className="bcard-feedback-heading bcard-feedback-heading--missed">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Missed
                          </span>
                          <div className="bcard-chips">
                            {missedItems.map((item, j) => (
                              <span key={j} className="bcard-chip bcard-chip--missed">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skipped: show expected answer directly, no toggle */}
                  {!hasUserAnswer && hasExpectedAnswer && (
                    <div className="bcard-diff">
                      <div className="bcard-diff-pane bcard-diff-expected">
                        <div className="bcard-diff-label">
                          <span className="bcard-diff-dot score-excellent" />
                          Expected answer
                        </div>
                        <div className="bcard-diff-content bcard-diff-content--text">
                          {question.expected_answer}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Answered: toggle to show/hide both answers */}
                  {hasUserAnswer && (hasExpectedAnswer || hasUserAnswer) && (
                    <>
                      <button
                        className="bcard-answers-toggle"
                        onClick={() => toggleAnswer(i, showAnswers)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points={showAnswers ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                        </svg>
                        {showAnswers ? "Hide answers" : "Show answers"}
                      </button>

                      {showAnswers && (
                        <div className="bcard-diff">
                          <div className="bcard-diff-pane bcard-diff-yours">
                            <div className="bcard-diff-label">
                              <span className={`bcard-diff-dot ${scoreClass}`} />
                              Your answer
                            </div>
                            <div className="bcard-diff-content bcard-diff-content--text">
                              {result.user_answer}
                            </div>
                          </div>
                          {hasExpectedAnswer && (
                            <>
                              <div className="bcard-diff-divider" />
                              <div className="bcard-diff-pane bcard-diff-expected">
                                <div className="bcard-diff-label">
                                  <span className="bcard-diff-dot score-excellent" />
                                  Expected answer
                                </div>
                                <div className="bcard-diff-content bcard-diff-content--text">
                                  {question.expected_answer}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
