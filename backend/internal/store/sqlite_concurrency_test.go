package store_test

import (
	"context"
	"path/filepath"
	"sync"
	"testing"

	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/store"
)

// newFileStore returns a store backed by a real file in a temp dir.
// Concurrency tests cannot use ":memory:" — every pooled connection would
// open its own private database.
func newFileStore(t *testing.T) *store.SQLiteStore {
	t.Helper()
	s, err := store.NewSQLite(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

// Grading runs in background goroutines (one per answered question), so
// several SaveGrade calls can land at once when a session is submitted.
// Every one of them must persist — a dropped write shows up to the user as
// "not answered", score 0.
func TestSaveGrade_Concurrent(t *testing.T) {
	const numQuestions = 12

	s := newFileStore(t)
	ctx := context.Background()

	bank := questionbank.New("Concurrency")
	for i := 0; i < numQuestions; i++ {
		bank.AddQuestion("Q", "A")
	}
	if err := s.SaveBank(ctx, bank); err != nil {
		t.Fatalf("SaveBank: %v", err)
	}
	for _, q := range bank.Questions {
		if err := s.AddQuestion(ctx, bank.ID, q); err != nil {
			t.Fatalf("AddQuestion: %v", err)
		}
	}

	full, err := s.GetBank(ctx, bank.ID)
	if err != nil {
		t.Fatalf("GetBank: %v", err)
	}
	session := practicesession.New(full)
	if err := s.SaveSession(ctx, session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}

	// Release all writers at once so they contend for the write lock.
	var start, done sync.WaitGroup
	start.Add(1)
	errs := make([]error, len(session.Questions))
	for i, q := range session.Questions {
		done.Add(1)
		go func(i int, questionID string) {
			defer done.Done()
			start.Wait()
			errs[i] = s.SaveGrade(ctx, session.ID, questionID, 80, []string{"a"}, nil, "answer")
		}(i, q.ID)
	}
	start.Done()
	done.Wait()

	for i, err := range errs {
		if err != nil {
			t.Errorf("SaveGrade #%d: %v", i, err)
		}
	}

	grades, err := s.GetGrades(ctx, session.ID)
	if err != nil {
		t.Fatalf("GetGrades: %v", err)
	}
	if len(grades) != numQuestions {
		t.Errorf("expected %d grades persisted, got %d", numQuestions, len(grades))
	}

	for _, q := range session.Questions {
		stats, err := s.GetQuestionStats(ctx, q.ID)
		if err != nil {
			t.Fatalf("GetQuestionStats: %v", err)
		}
		if stats.TimesAnswered != 1 {
			t.Errorf("question %s: expected TimesAnswered 1, got %d", q.ID, stats.TimesAnswered)
		}
	}
}
