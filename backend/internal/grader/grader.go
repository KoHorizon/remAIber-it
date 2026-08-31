package grader

import "context"

// Grader grades a user's answer against an expected answer.
// Implementations may call an LLM, use heuristics, or return canned results (for tests).
type Grader interface {
	// GradeAnswer returns the score plus the covered and missed key points.
	// bankType is one of "theory", "code", "cli".
	// customPrompt optionally overrides the default grading rules.
	//
	// This returns GradeResult rather than a JSON string on purpose: the only
	// consumer is Go code in internal/service, which used to re-parse the string
	// into an identical struct. The JSON tags on GradeResult are for decoding the
	// LLM's reply, not for talking to callers.
	GradeAnswer(ctx context.Context, question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (GradeResult, error)
}
