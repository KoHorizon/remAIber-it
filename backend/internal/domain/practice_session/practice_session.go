package practicesession

import (
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/id"
)

// Main Domain Entity
type PracticeSession struct {
	ID             string
	QuestionBankId string                  // Reference the QuestionBank domain entity
	Questions      []questionbank.Question // Might need to create a snappshot DTO, if original Question evolve, for now KISS
}

/*
 *  Note :
 *  For now, this name if fine
 *  If it evolve with multiple different constructor, improve name
 */
func New(bank *questionbank.QuestionBank) *PracticeSession {
	return &PracticeSession{
		ID:             id.GenerateID(),
		QuestionBankId: bank.ID,
		Questions:      bank.Questions,
	}
}
