import { Question, SessionResult } from "../App";
import "./Results.css";

type Props = {
  results: SessionResult;
  questions: Question[];
  bankSubject: string;
  onBack: () => void;
};

export function Results({ results, questions, bankSubject, onBack }: Props) {
  // Handle edge case where no questions were answered (timer ran out)
  const hasAnswers = results.max_score > 0;
  const percentage = hasAnswers
    ? Math.round((results.total_score / results.max_score) * 100)
    : 0;

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

  return (
    <div className="results animate-fade-in">
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

                  <p className="breakdown-question">{question?.subject}</p>

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
        <button className="btn btn-primary" onClick={onBack}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
