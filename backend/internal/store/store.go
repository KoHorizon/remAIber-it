package store

import (
	"errors"
	"sync"

	"github.com/remaimber-it/backend/internal/domain/category"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

var (
	ErrNotFound = errors.New("not found")
)

// Store defines the persistence contract for the application.
// Any backing implementation (SQLite, Postgres, in-memory for tests, …)
// must satisfy this interface.
type Store interface {
	// Categories
	SaveCategory(cat *category.Category) error
	GetCategory(id string) (*category.Category, error)
	ListCategories() ([]*category.Category, error)
	UpdateCategory(cat *category.Category) error
	DeleteCategory(id string) error
	GetCategoryMastery(categoryID string) (int, error)

	// Banks
	SaveBank(bank *questionbank.QuestionBank) error
	GetBank(id string) (*questionbank.QuestionBank, error)
	ListBanks() ([]*questionbank.QuestionBank, error)
	ListBanksByCategory(categoryID string) ([]*questionbank.QuestionBank, error)
	UpdateBankCategory(bankID string, categoryID *string) error
	UpdateBankGradingPrompt(bankID string, gradingPrompt *string) error
	DeleteBank(id string) error
	GetBankMastery(bankID string) (int, error)

	// Questions
	AddQuestion(bankID string, question questionbank.Question) error
	DeleteQuestion(id string) error
	GetQuestionStatsByBank(bankID string) ([]questionbank.QuestionStats, error)
	GetQuestionsOrderedByMastery(bankID string, ascending bool) ([]questionbank.Question, error)

	// Sessions
	SaveSession(session *practicesession.PracticeSession) error
	GetSession(id string) (*practicesession.PracticeSession, error)

	// Grades
	SaveGrade(sessionID string, questionID string, score int, covered, missed []string, userAnswer string) error
	SaveGradeFailure(sessionID string, questionID string, userAnswer string, reason string) error
	GetGrades(sessionID string) ([]StoredGrade, error)

	// WaitGroup management (for async grading)
	GetWaitGroup(sessionID string) *sync.WaitGroup
	AddToWaitGroup(sessionID string)
	DoneWaitGroup(sessionID string)

	// Lifecycle
	Close() error
}

type GradeStatus string

const (
	GradeStatusSuccess GradeStatus = "success"
	GradeStatusFailed  GradeStatus = "failed"
)

type StoredGrade struct {
	QuestionID string
	Score      int
	Covered    []string
	Missed     []string
	UserAnswer string
	Status     GradeStatus
}
