package practicesession

import (
	"math/rand"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/id"
)

// PracticeSession is the main domain entity for a practice session.
type PracticeSession struct {
	ID             string
	QuestionBankId string
	Questions      []questionbank.Question
	MaxDuration    *int // Duration in minutes (optional)
	FocusOnWeak    bool // Whether this session focuses on weak questions
}

// New creates a practice session with all questions from the bank (randomized).
// Kept for backward compatibility.
func New(bank *questionbank.QuestionBank) *PracticeSession {
	return NewWithConfig(bank, DefaultConfig(), nil)
}

// NewWithConfig creates a practice session with the given configuration.
// If orderedQuestions is provided (for focus on weak mode), use that order.
// Otherwise, questions are randomized.
func NewWithConfig(bank *questionbank.QuestionBank, config SessionConfig, orderedQuestions []questionbank.Question) *PracticeSession {
	var questions []questionbank.Question

	if config.FocusOnWeak && orderedQuestions != nil {
		// Use pre-ordered questions (sorted by mastery)
		questions = make([]questionbank.Question, len(orderedQuestions))
		copy(questions, orderedQuestions)
	} else {
		// Randomize questions
		questions = shuffleQuestions(bank.Questions)
	}

	// Apply question limit if set
	if config.MaxQuestions != nil && *config.MaxQuestions > 0 && *config.MaxQuestions < len(questions) {
		questions = questions[:*config.MaxQuestions]
	}

	var maxDurationMin *int
	if config.MaxDuration != nil {
		mins := int(config.MaxDuration.Minutes())
		maxDurationMin = &mins
	}

	return &PracticeSession{
		ID:             id.GenerateID(),
		QuestionBankId: bank.ID,
		Questions:      questions,
		MaxDuration:    maxDurationMin,
		FocusOnWeak:    config.FocusOnWeak,
	}
}

// shuffleQuestions returns a new slice with questions in random order.
func shuffleQuestions(questions []questionbank.Question) []questionbank.Question {
	shuffled := make([]questionbank.Question, len(questions))
	copy(shuffled, questions)

	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	return shuffled
}
