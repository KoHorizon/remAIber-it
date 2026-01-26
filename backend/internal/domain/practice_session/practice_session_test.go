package practicesession_test

import (
	"testing"
	"time"

	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

func createBankWithQuestions(n int) *questionbank.QuestionBank {
	bank := questionbank.New("Test Bank")
	for i := 0; i < n; i++ {
		bank.AddQuestions(
			"Question "+string(rune('A'+i)),
			"Answer "+string(rune('A'+i)),
		)
	}
	return bank
}

func TestNew_RandomizesQuestions(t *testing.T) {
	bank := createBankWithQuestions(20)

	// Create multiple sessions and check that at least one has different order
	// (statistically almost certain with 20 questions)
	foundDifferentOrder := false
	firstSession := practicesession.New(bank)

	for i := 0; i < 10; i++ {
		session := practicesession.New(bank)
		if !sameOrder(firstSession.Questions, session.Questions) {
			foundDifferentOrder = true
			break
		}
	}

	if !foundDifferentOrder {
		t.Error("expected questions to be randomized across sessions")
	}
}

func TestNew_IncludesAllQuestions(t *testing.T) {
	bank := createBankWithQuestions(10)
	session := practicesession.New(bank)

	if len(session.Questions) != 10 {
		t.Errorf("expected 10 questions, got %d", len(session.Questions))
	}
}

func TestNewWithConfig_MaxQuestions(t *testing.T) {
	bank := createBankWithQuestions(100)

	maxQ := 20
	config := practicesession.SessionConfig{
		MaxQuestions: &maxQ,
	}

	session := practicesession.NewWithConfig(bank, config, nil)

	if len(session.Questions) != 20 {
		t.Errorf("expected 20 questions, got %d", len(session.Questions))
	}
}

func TestNewWithConfig_MaxQuestionsGreaterThanAvailable(t *testing.T) {
	bank := createBankWithQuestions(5)

	maxQ := 20
	config := practicesession.SessionConfig{
		MaxQuestions: &maxQ,
	}

	session := practicesession.NewWithConfig(bank, config, nil)

	// Should include all 5 questions since we only have 5
	if len(session.Questions) != 5 {
		t.Errorf("expected 5 questions (all available), got %d", len(session.Questions))
	}
}

func TestNewWithConfig_MaxDuration(t *testing.T) {
	bank := createBankWithQuestions(10)

	duration := 10 * time.Minute
	config := practicesession.SessionConfig{
		MaxDuration: &duration,
	}

	session := practicesession.NewWithConfig(bank, config, nil)

	if session.MaxDuration == nil {
		t.Fatal("expected MaxDuration to be set")
	}

	if *session.MaxDuration != 10 {
		t.Errorf("expected 10 minutes, got %v", *session.MaxDuration)
	}
}

func TestNewWithConfig_CombinedConstraints(t *testing.T) {
	bank := createBankWithQuestions(50)

	maxQ := 15
	duration := 5 * time.Minute
	config := practicesession.SessionConfig{
		MaxQuestions: &maxQ,
		MaxDuration:  &duration,
	}

	session := practicesession.NewWithConfig(bank, config, nil)

	if len(session.Questions) != 15 {
		t.Errorf("expected 15 questions, got %d", len(session.Questions))
	}

	if session.MaxDuration == nil || *session.MaxDuration != 5 {
		t.Errorf("expected 5 minute duration, got %v", session.MaxDuration)
	}
}

func TestDefaultConfig(t *testing.T) {
	config := practicesession.DefaultConfig()

	if config.MaxQuestions != nil {
		t.Error("expected MaxQuestions to be nil by default")
	}

	if config.MaxDuration != nil {
		t.Error("expected MaxDuration to be nil by default")
	}

	if config.FocusOnWeak != false {
		t.Error("expected FocusOnWeak to be false by default")
	}
}

func TestNewWithConfig_DefaultConfigBehavesLikeNew(t *testing.T) {
	bank := createBankWithQuestions(10)

	session := practicesession.NewWithConfig(bank, practicesession.DefaultConfig(), nil)

	if len(session.Questions) != 10 {
		t.Errorf("expected all 10 questions, got %d", len(session.Questions))
	}

	if session.MaxDuration != nil {
		t.Error("expected no duration limit with default config")
	}
}

func TestNewWithConfig_FocusOnWeak(t *testing.T) {
	bank := createBankWithQuestions(10)

	config := practicesession.SessionConfig{
		FocusOnWeak: true,
	}

	// Provide pre-ordered questions (simulating ordered by mastery)
	orderedQuestions := make([]questionbank.Question, len(bank.Questions))
	copy(orderedQuestions, bank.Questions)

	session := practicesession.NewWithConfig(bank, config, orderedQuestions)

	if !session.FocusOnWeak {
		t.Error("expected FocusOnWeak to be true")
	}

	// When FocusOnWeak is true and orderedQuestions provided, order should be preserved
	if !sameOrder(orderedQuestions, session.Questions) {
		t.Error("expected questions to maintain provided order when FocusOnWeak is enabled")
	}
}

func TestNewWithConfig_FocusOnWeakWithLimit(t *testing.T) {
	bank := createBankWithQuestions(20)

	maxQ := 5
	config := practicesession.SessionConfig{
		MaxQuestions: &maxQ,
		FocusOnWeak:  true,
	}

	// Provide pre-ordered questions
	orderedQuestions := make([]questionbank.Question, len(bank.Questions))
	copy(orderedQuestions, bank.Questions)

	session := practicesession.NewWithConfig(bank, config, orderedQuestions)

	if len(session.Questions) != 5 {
		t.Errorf("expected 5 questions, got %d", len(session.Questions))
	}

	// Should take the first 5 from the ordered list
	if !sameOrder(orderedQuestions[:5], session.Questions) {
		t.Error("expected first 5 questions from ordered list")
	}
}

// Helper to check if two question slices have the same order
func sameOrder(a, b []questionbank.Question) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].ID != b[i].ID {
			return false
		}
	}
	return true
}
