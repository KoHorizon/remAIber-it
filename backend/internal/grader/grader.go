package grader

// Grader grades a user's answer against an expected answer.
// Implementations may call an LLM, use heuristics, or return canned results (for tests).
type Grader interface {
	// GradeAnswer returns a JSON string with {score, covered, missed}.
	// bankType is one of "theory", "code", "cli".
	// customPrompt optionally overrides the default grading rules.
	GradeAnswer(question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (string, error)
}
