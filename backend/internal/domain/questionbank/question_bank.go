// questionbank.go
package questionbank

import (
	"errors"

	"github.com/remaimber-it/backend/internal/id"
)

type QuestionBank struct {
	ID         string
	Subject    string
	CategoryID *string // Optional - can be nil for uncategorized banks
	Questions  []Question
}

func New(subject string) *QuestionBank {
	return &QuestionBank{
		ID:         id.GenerateID(),
		Subject:    subject,
		CategoryID: nil,
		Questions:  []Question{},
	}
}

func NewWithCategory(subject string, categoryID string) *QuestionBank {
	return &QuestionBank{
		ID:         id.GenerateID(),
		Subject:    subject,
		CategoryID: &categoryID,
		Questions:  []Question{},
	}
}

func (qb *QuestionBank) SetCategory(categoryID *string) {
	qb.CategoryID = categoryID
}

func (qb *QuestionBank) AddQuestions(subject string, expectedAnswer string) error {
	if subject == "" {
		return errors.New("question subject cannot be empty")
	}

	qb.Questions = append(qb.Questions, Question{
		ID:             id.GenerateID(),
		Subject:        subject,
		ExpectedAnswer: expectedAnswer,
	})
	return nil
}
