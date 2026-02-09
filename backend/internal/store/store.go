package store

import (
	"context"
	"errors"

	"github.com/remaimber-it/backend/internal/domain/category"
	"github.com/remaimber-it/backend/internal/domain/folder"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

var (
	ErrNotFound         = errors.New("not found")
	ErrSessionCompleted = errors.New("session already completed")
	ErrSystemFolder     = errors.New("cannot modify system folder")
)

// Store defines the persistence contract for the application.
type Store interface {
	// Folders
	SaveFolder(ctx context.Context, f *folder.Folder) error
	GetFolder(ctx context.Context, id string) (*folder.Folder, error)
	ListFolders(ctx context.Context) ([]*folder.Folder, error)
	UpdateFolder(ctx context.Context, f *folder.Folder) error
	DeleteFolder(ctx context.Context, id string) error
	GetFolderMastery(ctx context.Context, folderID string) (int, error)

	// System "Deleted" folder
	GetOrCreateDeletedFolder(ctx context.Context) (*folder.Folder, error)
	EmptyDeletedFolder(ctx context.Context) error // Cascade-delete all content inside the Deleted folder

	// Categories
	SaveCategory(ctx context.Context, cat *category.Category) error
	GetCategory(ctx context.Context, id string) (*category.Category, error)
	ListCategories(ctx context.Context) ([]*category.Category, error)
	ListCategoriesByFolder(ctx context.Context, folderID string) ([]*category.Category, error)
	UpdateCategory(ctx context.Context, cat *category.Category) error
	UpdateCategoryFolder(ctx context.Context, categoryID string, folderID *string) error
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
