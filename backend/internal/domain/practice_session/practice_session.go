package practicesession

import (
	"math/rand"
	"time"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/id"
)

// PracticeSession is the main domain entity for a practice session.
type PracticeSession struct {
	ID             string
	QuestionBankId string
	Questions      []questionbank.Question
	MaxDuration    *time.Duration // Optional time limit for the session
}

// New creates a practice session with all questions from the bank (randomized).
// Kept for backward compatibility.
func New(bank *questionbank.QuestionBank) *PracticeSession {
	return NewWithConfig(bank, DefaultConfig())
}

// NewWithConfig creates a practice session with the given configuration.
// Questions are always randomized. If MaxQuestions is set and less than
// the total available, only that many questions are included.
func NewWithConfig(bank *questionbank.QuestionBank, config SessionConfig) *PracticeSession {
	questions := shuffleQuestions(bank.Questions)

	// Apply question limit if set
	if config.MaxQuestions != nil && *config.MaxQuestions > 0 && *config.MaxQuestions < len(questions) {
		questions = questions[:*config.MaxQuestions]
	}

	return &PracticeSession{
		ID:             id.GenerateID(),
		QuestionBankId: bank.ID,
		Questions:      questions,
		MaxDuration:    config.MaxDuration,
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
