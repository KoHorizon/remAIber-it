package store

import "errors"

var (
	ErrNotFound = errors.New("not found")
)

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
