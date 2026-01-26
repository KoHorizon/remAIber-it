package practicesession

import "time"

// SessionConfig holds optional constraints for a practice session.
type SessionConfig struct {
	MaxQuestions *int           // nil = all questions from the bank
	MaxDuration  *time.Duration // nil = no time limit
	FocusOnWeak  bool           // true = prioritize low mastery questions
}

// DefaultConfig returns a config with no constraints.
func DefaultConfig() SessionConfig {
	return SessionConfig{
		MaxQuestions: nil,
		MaxDuration:  nil,
		FocusOnWeak:  false,
	}
}
