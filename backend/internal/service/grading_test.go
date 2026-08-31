package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/store"
)

var _ grader.Grader = okGrader{}
var _ grader.Grader = errGrader{}

// okGrader returns a well-formed grading response.
type okGrader struct{}

func (okGrader) GradeAnswer(ctx context.Context, question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (grader.GradeResult, error) {
	return grader.GradeResult{Score: 80, Covered: []string{"a"}, Missed: []string{"b"}}, nil
}

var errGraderBoom = errors.New("LLM unreachable")

// errGrader always fails.
type errGrader struct{}

func (errGrader) GradeAnswer(ctx context.Context, question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (grader.GradeResult, error) {
	return grader.GradeResult{}, errGraderBoom
}

// failingSaveStore rejects SaveGrade and records the SaveGradeFailure fallback.
// store.Store is embedded (nil) because grade() touches no other method.
type failingSaveStore struct {
	store.Store
	failureReason string
	failureCalls  int
}

func (s *failingSaveStore) SaveGrade(ctx context.Context, sessionID, questionID string, score int, covered, missed []string, userAnswer string) error {
	return errors.New("database is locked (5) (SQLITE_BUSY)")
}

func (s *failingSaveStore) SaveGradeFailure(ctx context.Context, sessionID, questionID, userAnswer, reason string) error {
	s.failureCalls++
	s.failureReason = reason
	return nil
}

// recordingStore captures what SaveGrade was handed.
type recordingStore struct {
	store.Store
	saveCalls int
	score     int
	covered   []string
	missed    []string
	answer    string
}

func (s *recordingStore) SaveGrade(ctx context.Context, sessionID, questionID string, score int, covered, missed []string, userAnswer string) error {
	s.saveCalls++
	s.score = score
	s.covered = covered
	s.missed = missed
	s.answer = userAnswer
	return nil
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// The grader's verdict must reach the store unaltered. This pins the boundary
// between grader and store so it stays fixed while the contract between them
// changes shape.
func TestGrade_PersistsGraderVerdictUnaltered(t *testing.T) {
	st := &recordingStore{}
	gs := NewGradingService(st, okGrader{}, nil, discardLogger())

	gs.grade(GradeRequest{
		SessionID:      "s1",
		QuestionID:     "q1",
		Question:       "What is 2+2?",
		ExpectedAnswer: "4",
		UserAnswer:     "four",
		BankType:       "theory",
	})

	if st.saveCalls != 1 {
		t.Fatalf("expected SaveGrade to be called once, got %d", st.saveCalls)
	}
	if st.score != 80 {
		t.Errorf("score = %d, want 80", st.score)
	}
	if len(st.covered) != 1 || st.covered[0] != "a" {
		t.Errorf("covered = %v, want [a]", st.covered)
	}
	if len(st.missed) != 1 || st.missed[0] != "b" {
		t.Errorf("missed = %v, want [b]", st.missed)
	}
	if st.answer != "four" {
		t.Errorf("userAnswer = %q, want %q", st.answer, "four")
	}
}

// GradeOnce is the simulation path — it persists nothing, so its return values
// are the entire observable result.
func TestGradeOnce_ReturnsGraderVerdict(t *testing.T) {
	gs := NewGradingService(nil, okGrader{}, nil, discardLogger())

	score, covered, missed, err := gs.GradeOnce(context.Background(), GradeRequest{
		Question:       "What is 2+2?",
		ExpectedAnswer: "4",
		UserAnswer:     "four",
		BankType:       "theory",
	})
	if err != nil {
		t.Fatalf("GradeOnce returned error: %v", err)
	}
	if score != 80 {
		t.Errorf("score = %d, want 80", score)
	}
	if len(covered) != 1 || covered[0] != "a" {
		t.Errorf("covered = %v, want [a]", covered)
	}
	if len(missed) != 1 || missed[0] != "b" {
		t.Errorf("missed = %v, want [b]", missed)
	}
}

// A grader error must not be persisted as a grade.
func TestGradeOnce_PropagatesGraderError(t *testing.T) {
	gs := NewGradingService(nil, errGrader{}, nil, discardLogger())

	_, _, _, err := gs.GradeOnce(context.Background(), GradeRequest{BankType: "theory"})
	if err == nil {
		t.Fatal("expected an error, got nil")
	}
	if !errors.Is(err, errGraderBoom) {
		t.Errorf("error = %v, want it to wrap %v", err, errGraderBoom)
	}
}

// A grade that cannot be persisted must be recorded as a failure, otherwise
// completeSession renders the question as "not answered", score 0 — the user
// is shown a wrong result instead of an error.
func TestGrade_PersistFailureIsRecorded(t *testing.T) {
	st := &failingSaveStore{}
	gs := NewGradingService(st, okGrader{}, nil, discardLogger())

	gs.grade(GradeRequest{
		SessionID:      "s1",
		QuestionID:     "q1",
		Question:       "What is 2+2?",
		ExpectedAnswer: "4",
		UserAnswer:     "four",
		BankType:       "theory",
	})

	if st.failureCalls != 1 {
		t.Fatalf("expected SaveGradeFailure to be called once, got %d", st.failureCalls)
	}
	if st.failureReason == "" {
		t.Error("expected a non-empty failure reason")
	}
}
