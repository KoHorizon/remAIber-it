package questionbank

import (
	"errors"

	"github.com/remaimber-it/backend/internal/id"
)

type BankType string

const (
	BankTypeTheory BankType = "theory"
	BankTypeCode   BankType = "code"
	BankTypeCLI    BankType = "cli"
)

type BankDifficulty string

const (
	BankDifficultyEasy   BankDifficulty = "easy"
	BankDifficultyMedium BankDifficulty = "medium"
	BankDifficultyHard   BankDifficulty = "hard"
)

type QuestionBank struct {
	ID            string
	Subject       string
	CategoryID    *string         // Optional - can be nil for uncategorized banks
	BankType      BankType        // theory, code, or cli
	Language      *string         // Optional - programming language for code banks
	Difficulty    *BankDifficulty // Optional - easy, medium, or hard
	GradingPrompt *string         // Optional default grading rules for all questions in the bank
	Questions     []Question
}

func New(subject string) *QuestionBank {
	return &QuestionBank{
		ID:        id.GenerateID(),
		Subject:   subject,
		BankType:  BankTypeTheory,
		Questions: []Question{},
	}
}

func NewWithCategory(subject string, categoryID string) *QuestionBank {
	return &QuestionBank{
		ID:         id.GenerateID(),
		Subject:    subject,
		CategoryID: &categoryID,
		BankType:   BankTypeTheory,
		Questions:  []Question{},
	}
}

func NewWithOptions(subject string, categoryID *string, bankType BankType, language *string, difficulty *BankDifficulty) *QuestionBank {
	bt := bankType
	if bt == "" {
		bt = BankTypeTheory
	}
	return &QuestionBank{
		ID:         id.GenerateID(),
		Subject:    subject,
		CategoryID: categoryID,
		BankType:   bt,
		Language:   language,
		Difficulty: difficulty,
		Questions:  []Question{},
	}
}

func (qb *QuestionBank) SetCategory(categoryID *string) {
	qb.CategoryID = categoryID
}

// AddQuestion appends a single question to the bank.
func (qb *QuestionBank) AddQuestion(subject string, expectedAnswer string) error {
	return qb.AddQuestionWithGradingPrompt(subject, expectedAnswer, nil, nil)
}

// AddQuestionWithGradingPrompt appends a question with optional custom grading prompt and hint.
func (qb *QuestionBank) AddQuestionWithGradingPrompt(subject string, expectedAnswer string, gradingPrompt *string, hint *string) error {
	if subject == "" {
		return errors.New("question subject cannot be empty")
	}

	qb.Questions = append(qb.Questions, Question{
		ID:             id.GenerateID(),
		Subject:        subject,
		ExpectedAnswer: expectedAnswer,
		GradingPrompt:  gradingPrompt,
		Hint:           hint,
	})
	return nil
}
