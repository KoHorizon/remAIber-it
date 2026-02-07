package store

import (
	"context"
	"errors"

	"github.com/remaimber-it/backend/internal/domain/category"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

var (
	ErrNotFound         = errors.New("not found")
	ErrSessionCompleted = errors.New("session already completed")
)

// Store defines the persistence contract for the application.
// Any backing implementation (SQLite, Postgres, in-memory for tests, …)
// must satisfy this interface.
type Store interface {
	// Categories
	SaveCategory(ctx context.Context, cat *category.Category) error
	GetCategory(ctx context.Context, id string) (*category.Category, error)
	ListCategories(ctx context.Context) ([]*category.Category, error)
	UpdateCategory(ctx context.Context, cat *category.Category) error
	DeleteCategory(ctx context.Context, id string) error
	GetCategoryMastery(ctx context.Context, categoryID string) (int, error)

	// Banks
	SaveBank(ctx context.Context, bank *questionbank.QuestionBank) error
	GetBank(ctx context.Context, id string) (*questionbank.QuestionBank, error)
	ListBanks(ctx context.Context) ([]*questionbank.QuestionBank, error)
	ListBanksByCategory(ctx context.Context, categoryID string) ([]*questionbank.QuestionBank, error)
	UpdateBankCategory(ctx context.Context, bankID string, categoryID *string) error
	UpdateBankGradingPrompt(ctx context.Context, bankID string, gradingPrompt *string) error
	DeleteBank(ctx context.Context, id string) error
	GetBankMastery(ctx context.Context, bankID string) (int, error)

	// Questions
	AddQuestion(ctx context.Context, bankID string, question questionbank.Question) error
	DeleteQuestion(ctx context.Context, id string) error
	GetQuestionStatsByBank(ctx context.Context, bankID string) ([]questionbank.QuestionStats, error)
	GetQuestionsOrderedByMastery(ctx context.Context, bankID string, ascending bool) ([]questionbank.Question, error)

	// Sessions
	SaveSession(ctx context.Context, session *practicesession.PracticeSession) error
	GetSession(ctx context.Context, id string) (*practicesession.PracticeSession, error)
	CompleteSession(ctx context.Context, id string) error

	// Grades
	SaveGrade(ctx context.Context, sessionID string, questionID string, score int, covered, missed []string, userAnswer string) error
	SaveGradeFailure(ctx context.Context, sessionID string, questionID string, userAnswer string, reason string) error
	GetGrades(ctx context.Context, sessionID string) ([]StoredGrade, error)

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
