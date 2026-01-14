package practicesession

import (
	"crypto/rand"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

// Main Domain Entity
type PracticeSession struct {
	ID string
	QuestionBankId string // Reference the QuestionBank domain entity
	Questions []questionbank.Question // Might need to create a snappshot DTO, if original Question evolve, for now KISS
}

/*
 *  Note :
 *  For now, this name if fine
 *  If it evolve with multiple different constructor, improve name
 */
func New(bank *questionbank.QuestionBank) *PracticeSession {
	return &PracticeSession{
		ID: generateID(),
		QuestionBankId: bank.ID,
		Questions: bank.Questions,
	}
}


// generateID creates a unique ID for questions
func generateID() string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    b := make([]byte, 16)
    rand.Read(b)
    for i := range b {
        b[i] = chars[b[i]%byte(len(chars))]
    }
    return string(b)
}