package store

import (
	"errors"
	"sync"

	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

var (
	ErrNotFound = errors.New("not found")
)

type StoredGrade struct {
	QuestionID string
	Score      int
	Covered    []string
	Missed     []string
}

type Store struct {
	banks    map[string]*questionbank.QuestionBank
	sessions map[string]*practicesession.PracticeSession
	answers  map[string][]practicesession.SessionAnswer
	grades   map[string][]StoredGrade
	gradeWg  map[string]*sync.WaitGroup // add this
	mu       sync.RWMutex
}

func New() *Store {
	return &Store{
		banks:    make(map[string]*questionbank.QuestionBank),
		sessions: make(map[string]*practicesession.PracticeSession),
		answers:  make(map[string][]practicesession.SessionAnswer),
		grades:   make(map[string][]StoredGrade),
		gradeWg:  make(map[string]*sync.WaitGroup), // add this
	}
}

// Banks
func (s *Store) SaveBank(bank *questionbank.QuestionBank) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.banks[bank.ID] = bank
}

func (s *Store) GetBank(id string) (*questionbank.QuestionBank, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	bank, exists := s.banks[id]
	if !exists {
		return nil, ErrNotFound
	}
	return bank, nil
}

func (s *Store) ListBanks() []*questionbank.QuestionBank {
	s.mu.RLock()
	defer s.mu.RUnlock()
	banks := make([]*questionbank.QuestionBank, 0, len(s.banks))
	for _, bank := range s.banks {
		banks = append(banks, bank)
	}
	return banks
}

// Sessions
func (s *Store) SaveSession(session *practicesession.PracticeSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.ID] = session
	s.answers[session.ID] = []practicesession.SessionAnswer{}
	s.grades[session.ID] = []StoredGrade{}
	s.gradeWg[session.ID] = &sync.WaitGroup{} // add this
}

func (s *Store) GetSession(id string) (*practicesession.PracticeSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, exists := s.sessions[id]
	if !exists {
		return nil, ErrNotFound
	}
	return session, nil
}

// Answers
func (s *Store) AddAnswer(answer practicesession.SessionAnswer) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.sessions[answer.SessionID]; !exists {
		return ErrNotFound
	}
	s.answers[answer.SessionID] = append(s.answers[answer.SessionID], answer)
	return nil
}

func (s *Store) GetAnswers(sessionID string) ([]practicesession.SessionAnswer, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	answers, exists := s.answers[sessionID]
	if !exists {
		return nil, ErrNotFound
	}
	return answers, nil
}

// Grading
func (s *Store) AddGrade(sessionID string, grade StoredGrade) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.grades[sessionID] = append(s.grades[sessionID], grade)
}

func (s *Store) GetGrades(sessionID string) ([]StoredGrade, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	grades, exists := s.grades[sessionID]
	if !exists {
		return nil, ErrNotFound
	}
	return grades, nil
}

func (s *Store) GetWaitGroup(sessionID string) *sync.WaitGroup {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.gradeWg[sessionID]
}
