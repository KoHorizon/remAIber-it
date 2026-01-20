package store

import "errors"

var (
	ErrNotFound = errors.New("not found")
)

type StoredGrade struct {
	QuestionID string
	Score      int
	Covered    []string
	Missed     []string
}
