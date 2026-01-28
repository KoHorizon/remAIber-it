import React, { useState } from "react";
import { SessionResult, BankType } from "../App";
import { CodeEditor } from "./CodeEditor";
import { TerminalDisplay } from "./TerminalDisplay";
import "./Results.css";

type ResultQuestion = {
  id: string;
  subject: string;
  expected_answer?: string;
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
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(
    new Set(),
  );

  const isCodeMode = bankType === "code" || bankType === "cli";

  // Handle edge case where no questions were answered (timer ran out)
  const hasAnswers = results.max_score > 0;
  const percentage = hasAnswers
    ? Math.round((results.total_score / results.max_score) * 100)
    : 0;

  const toggleAnswer = (index: number) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getScoreClass = () => {
    if (!hasAnswers) return "score-poor";
    if (percentage >= 90) return "score-excellent";
    if (percentage >= 70) return "score-good";
    if (percentage >= 50) return "score-needs-work";
    return "score-poor";
  };

  const getMessage = () => {
    if (!hasAnswers)
      return "Time ran out before you could answer any questions. Try again!";
    if (percentage >= 90)
      return "Excellent work! You have a strong grasp of this material.";
    if (percentage >= 70)
      return "Good job! Keep practicing to reinforce your knowledge.";
    if (percentage >= 50)
      return "You're getting there. Review the missed concepts and try again.";
    return "Keep studying! Focus on the concepts you missed.";
  };

  // Render question text with formatting support
  function renderFormattedQuestion(text: string): React.ReactNode {
    const lines = text.split("\n");
    const elements: React.JSX.Element[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="result-question-list">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineCode(item)}</li>
            ))}
          </ul>,
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.substring(2));
      } else if (trimmed === "") {
        flushList();
      } else {
        flushList();
        elements.push(
          <span key={`line-${index}`}>
            {renderInlineCode(trimmed)}
            {index < lines.length - 1 && <br />}
          </span>,
        );
      }
    });

    flushList();
    return elements;
  }

  function renderInlineCode(text: string): React.ReactNode {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="inline-code">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  return (
    <div
      className={`results animate-fade-in ${isCodeMode ? "results-code-mode" : ""}`}
    >
      <div className="results-header">
        <h3>Session Complete</h3>
        <h1>{bankSubject}</h1>
      </div>

      <div className="results-summary">
        <div className={`score-circle ${getScoreClass()}`}>
          <span className="score-value">{percentage}%</span>
          <span className="score-label">Score</span>
        </div>
        <p className="results-message">{getMessage()}</p>
        <p className="results-points">
          {results.total_score} / {results.max_score} points
        </p>
      </div>

      <div className="results-breakdown">
        <h3>Question Breakdown</h3>
        {!hasAnswers ? (
          <p className="no-answers-message">
            No questions were answered in this session.
          </p>
        ) : (
          <div className="breakdown-list">
            {results.results.map((result, i) => {
              const question = questions[i];
              const questionScore = Math.round(result.score);
              const isExpanded = expandedAnswers.has(i);
              const hasExpectedAnswer = question?.expected_answer;
              const hasUserAnswer =
                result.user_answer && result.user_answer.trim() !== "";

              // Code/CLI mode: Full width layout
              if (isCodeMode) {
                return (
                  <div
                    key={i}
                    className="breakdown-card breakdown-card-code card"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {/* Header */}
                    <div className="breakdown-header-code">
                      <span className="breakdown-number">Q{i + 1}</span>
                      <span
                        className={`breakdown-score ${questionScore >= 70 ? "high" : questionScore >= 40 ? "mid" : "low"}`}
                      >
                        {questionScore}%
                      </span>
                    </div>

                    {/* Question content on top */}
                    <div className="breakdown-question-section">
                      <div className="breakdown-question-content">
                        {renderFormattedQuestion(question?.subject || "")}
                      </div>
                    </div>

                    {/* Answers row: side by side */}
                    <div className="breakdown-answers-section">
                      {/* Left column: Your Answer */}
                      <div className="breakdown-answer-column">
                        <div className="breakdown-answer-block">
                          <span className="answer-block-label">
                            Your Answer
                          </span>
                          <div className="answer-block-content">
                            {hasUserAnswer ? (
                              bankType === "cli" ? (
                                <TerminalDisplay
                                  value={result.user_answer}
                                  expanded={true}
                                />
                              ) : (
                                <CodeEditor
                                  value={result.user_answer}
                                  onChange={() => {}}
                                  language={bankLanguage || "plaintext"}
                                  height="350px"
                                  readOnly={true}
                                />
                              )
                            ) : (
                              <div className="answer-empty">Not answered</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right column: Expected Answer */}
                      <div className="breakdown-answer-column">
                        <div className="breakdown-answer-block">
                          <span className="answer-block-label">
                            Expected Answer
                          </span>
                          <div className="answer-block-content">
                            {hasExpectedAnswer ? (
                              bankType === "cli" ? (
                                <TerminalDisplay
                                  value={question.expected_answer || ""}
                                  expanded={true}
                                />
                              ) : (
                                <CodeEditor
                                  value={question.expected_answer || ""}
                                  onChange={() => {}}
                                  language={bankLanguage || "plaintext"}
                                  height="350px"
                                  readOnly={true}
                                />
                              )
                            ) : (
                              <div className="answer-empty">
                                No expected answer
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feedback row: Covered and Missed side by side */}
                    <div className="breakdown-feedback-row">
                      <div className="feedback-section">
                        {result.covered.length > 0 ? (
                          <>
                            <span className="feedback-label tag tag-success">
                              ✓ Covered
                            </span>
                            <ul className="feedback-list">
                              {result.covered.map((item, j) => (
                                <li key={j}>{item}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <span
                            className="feedback-label tag tag-success"
                            style={{ opacity: 0.5 }}
                          >
                            ✓ Covered (none)
                          </span>
                        )}
                      </div>

                      <div className="feedback-section">
                        {result.missed.length > 0 ? (
                          <>
                            <span className="feedback-label tag tag-error">
                              ✗ Missed
                            </span>
                            <ul className="feedback-list">
                              {result.missed.map((item, j) => (
                                <li key={j}>{item}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <span
                            className="feedback-label tag tag-error"
                            style={{ opacity: 0.5 }}
                          >
                            ✗ Missed (none)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Theory mode: Original vertical layout
              return (
                <div
                  key={i}
                  className="breakdown-card card"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="breakdown-header">
                    <span className="breakdown-number">Q{i + 1}</span>
                    <span
                      className={`breakdown-score ${questionScore >= 70 ? "high" : questionScore >= 40 ? "mid" : "low"}`}
                    >
                      {questionScore}%
                    </span>
                  </div>

                  <div className="breakdown-question">
                    {renderFormattedQuestion(question?.subject || "")}
                  </div>

                  {/* Answer Comparison Dropdown */}
                  {(hasExpectedAnswer || hasUserAnswer) && (
                    <div className="answer-comparison-section">
                      <button
                        className="answer-comparison-toggle"
                        onClick={() => toggleAnswer(i)}
                        aria-expanded={isExpanded}
                      >
                        <span>
                          {isExpanded ? "Hide answers" : "Show answers"}
                        </span>
                        <span
                          className={`toggle-icon ${isExpanded ? "expanded" : ""}`}
                        >
                          ▼
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="answer-comparison-content">
                          {hasUserAnswer && (
                            <div className="answer-block given-answer">
                              <span className="answer-label">Your answer</span>
                              <div className="answer-text">
                                {result.user_answer}
                              </div>
                            </div>
                          )}
                          {!hasUserAnswer && (
                            <div className="answer-block given-answer not-answered">
                              <span className="answer-label">Your answer</span>
                              <div className="answer-text empty">
                                Not answered
                              </div>
                            </div>
                          )}
                          {hasExpectedAnswer && (
                            <div className="answer-block expected-answer">
                              <span className="answer-label">
                                Expected answer
                              </span>
                              <div className="answer-text">
                                {question.expected_answer}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="breakdown-feedback">
                    {result.covered.length > 0 && (
                      <div className="feedback-section">
                        <span className="feedback-label tag tag-success">
                          ✓ Covered
                        </span>
                        <ul className="feedback-list">
                          {result.covered.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.missed.length > 0 && (
                      <div className="feedback-section">
                        <span className="feedback-label tag tag-error">
                          ✗ Missed
                        </span>
                        <ul className="feedback-list">
                          {result.missed.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="results-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Home
        </button>
        <button className="btn btn-primary" onClick={onRetry}>
          Retry Same Questions
        </button>
      </div>
    </div>
  );
}
