// questionbank.go
package questionbank

import (
	"crypto/rand"
	"errors"
)

type QuestionBank struct {
    ID        string      // Public - just data
    Subject   string      // Public - just data
    Questions []Question  // Public - but read the note below
}


// TODO : Might need to reconsider the naming of this constructor
func New(subject string) *QuestionBank {
    return &QuestionBank{
    	ID: generateID(),
        Subject:   subject,
        Questions: []Question{},
    }
}

func (qb *QuestionBank) AddQuestions(subject string, expectedAnswer string) error {
    // This is a method because it has validation/business logic
    if subject == "" {
        return errors.New("question subject cannot be empty")
    }
    
    qb.Questions = append(qb.Questions, Question{
        ID:      generateID(), 
        Subject: subject,
        ExpectedAnswer: expectedAnswer,
    })
    return nil
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