package questionbank_test

import (
	"testing"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

func TestNewQuestionBank(t *testing.T) {
	bank := questionbank.New("Architecture")

	if bank.Subject != "Architecture" {
		t.Errorf("expected subject %q, got %q", "Architecture", bank.Subject)
	}

	if len(bank.Questions) != 0 {
		t.Errorf("expected empty question bank, got %d questions", len(bank.Questions))
	}
}

func TestAddQuestion(t *testing.T) {
	bank := questionbank.New("Architecture")

	err := bank.AddQuestion("What is DDD?", "Domain-Driven Design")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(bank.Questions) != 1 {
		t.Fatalf("expected 1 question, got %d", len(bank.Questions))
	}

	q := bank.Questions[0]
	if q.Subject != "What is DDD?" {
		t.Errorf("expected subject %q, got %q", "What is DDD?", q.Subject)
	}
}

func TestAddQuestion_EmptySubject(t *testing.T) {
	bank := questionbank.New("Architecture")

	err := bank.AddQuestion("", "Answer")
	if err == nil {
		t.Error("expected error for empty subject, got nil")
	}

	// Verify nothing was added
	if len(bank.Questions) != 0 {
		t.Error("expected no questions after failed add")
	}
}

func TestAddMultipleQuestions(t *testing.T) {
	bank := questionbank.New("Architecture")

	questions := []struct {
		subject string
		answer  string
	}{
		{"Question 1", "Answer 1"},
		{"Question 2", "Answer 2"},
		{"Question 3", "Answer 3"},
	}

	for _, q := range questions {
		if err := bank.AddQuestion(q.subject, q.answer); err != nil {
			t.Fatalf("failed to add question: %v", err)
		}
	}

	if len(bank.Questions) != 3 {
		t.Errorf("expected 3 questions, got %d", len(bank.Questions))
	}
}
