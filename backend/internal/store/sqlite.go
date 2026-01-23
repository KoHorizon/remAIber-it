// internal/store/sqlite.go
package store

import (
	"database/sql"
	"encoding/json"
	"sync"

	_ "modernc.org/sqlite"

	"github.com/remaimber-it/backend/internal/domain/category"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

const schema = `
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    category_id TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE IF NOT EXISTS session_questions (
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_subject TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    covered TEXT NOT NULL,
    missed TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
`

type SQLiteStore struct {
	db      *sql.DB
	gradeWg map[string]*sync.WaitGroup
	mu      sync.RWMutex
}

func NewSQLite(dbPath string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	return &SQLiteStore{
		db:      db,
		gradeWg: make(map[string]*sync.WaitGroup),
	}, nil
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// ============================================================================
// Categories
// ============================================================================

func (s *SQLiteStore) SaveCategory(cat *category.Category) error {
	_, err := s.db.Exec("INSERT INTO categories (id, name) VALUES (?, ?)", cat.ID, cat.Name)
	return err
}

func (s *SQLiteStore) GetCategory(id string) (*category.Category, error) {
	var cat category.Category
	err := s.db.QueryRow("SELECT id, name FROM categories WHERE id = ?", id).Scan(&cat.ID, &cat.Name)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (s *SQLiteStore) ListCategories() ([]*category.Category, error) {
	rows, err := s.db.Query("SELECT id, name FROM categories")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*category.Category
	for rows.Next() {
		var cat category.Category
		if err := rows.Scan(&cat.ID, &cat.Name); err != nil {
			return nil, err
		}
		categories = append(categories, &cat)
	}
	return categories, nil
}

func (s *SQLiteStore) UpdateCategory(cat *category.Category) error {
	result, err := s.db.Exec("UPDATE categories SET name = ? WHERE id = ?", cat.Name, cat.ID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *SQLiteStore) DeleteCategory(id string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// First, delete all questions belonging to banks in this category
	_, err = tx.Exec(`
		DELETE FROM questions 
		WHERE bank_id IN (SELECT id FROM banks WHERE category_id = ?)
	`, id)
	if err != nil {
		return err
	}

	// Then, delete all banks in this category
	_, err = tx.Exec("DELETE FROM banks WHERE category_id = ?", id)
	if err != nil {
		return err
	}

	// Finally, delete the category itself
	result, err := tx.Exec("DELETE FROM categories WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}

	return tx.Commit()
}

// ============================================================================
// Banks
// ============================================================================

func (s *SQLiteStore) SaveBank(bank *questionbank.QuestionBank) error {
	_, err := s.db.Exec("INSERT INTO banks (id, subject, category_id) VALUES (?, ?, ?)", bank.ID, bank.Subject, bank.CategoryID)
	return err
}

func (s *SQLiteStore) GetBank(id string) (*questionbank.QuestionBank, error) {
	var bank questionbank.QuestionBank
	var categoryID sql.NullString

	err := s.db.QueryRow("SELECT id, subject, category_id FROM banks WHERE id = ?", id).Scan(&bank.ID, &bank.Subject, &categoryID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if categoryID.Valid {
		bank.CategoryID = &categoryID.String
	}

	rows, err := s.db.Query("SELECT id, subject, expected_answer FROM questions WHERE bank_id = ?", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var q questionbank.Question
		if err := rows.Scan(&q.ID, &q.Subject, &q.ExpectedAnswer); err != nil {
			return nil, err
		}
		bank.Questions = append(bank.Questions, q)
	}

	return &bank, nil
}

func (s *SQLiteStore) ListBanks() ([]*questionbank.QuestionBank, error) {
	rows, err := s.db.Query("SELECT id, subject, category_id FROM banks")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []*questionbank.QuestionBank
	for rows.Next() {
		var bank questionbank.QuestionBank
		var categoryID sql.NullString
		if err := rows.Scan(&bank.ID, &bank.Subject, &categoryID); err != nil {
			return nil, err
		}
		if categoryID.Valid {
			bank.CategoryID = &categoryID.String
		}
		banks = append(banks, &bank)
	}
	return banks, nil
}

func (s *SQLiteStore) ListBanksByCategory(categoryID string) ([]*questionbank.QuestionBank, error) {
	rows, err := s.db.Query("SELECT id, subject, category_id FROM banks WHERE category_id = ?", categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []*questionbank.QuestionBank
	for rows.Next() {
		var bank questionbank.QuestionBank
		var catID sql.NullString
		if err := rows.Scan(&bank.ID, &bank.Subject, &catID); err != nil {
			return nil, err
		}
		if catID.Valid {
			bank.CategoryID = &catID.String
		}
		banks = append(banks, &bank)
	}
	return banks, nil
}

func (s *SQLiteStore) ListUncategorizedBanks() ([]*questionbank.QuestionBank, error) {
	rows, err := s.db.Query("SELECT id, subject, category_id FROM banks WHERE category_id IS NULL")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []*questionbank.QuestionBank
	for rows.Next() {
		var bank questionbank.QuestionBank
		var categoryID sql.NullString
		if err := rows.Scan(&bank.ID, &bank.Subject, &categoryID); err != nil {
			return nil, err
		}
		banks = append(banks, &bank)
	}
	return banks, nil
}

func (s *SQLiteStore) UpdateBankCategory(bankID string, categoryID *string) error {
	result, err := s.db.Exec("UPDATE banks SET category_id = ? WHERE id = ?", categoryID, bankID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *SQLiteStore) DeleteBank(id string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM questions WHERE bank_id = ?", id)
	if err != nil {
		return err
	}

	result, err := tx.Exec("DELETE FROM banks WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}

	return tx.Commit()
}

func (s *SQLiteStore) AddQuestion(bankID string, question questionbank.Question) error {
	_, err := s.db.Exec(
		"INSERT INTO questions (id, bank_id, subject, expected_answer) VALUES (?, ?, ?, ?)",
		question.ID, bankID, question.Subject, question.ExpectedAnswer,
	)
	return err
}

func (s *SQLiteStore) DeleteQuestion(id string) error {
	result, err := s.db.Exec("DELETE FROM questions WHERE id = ?", id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

// ============================================================================
// Sessions
// ============================================================================

func (s *SQLiteStore) SaveSession(session *practicesession.PracticeSession) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("INSERT INTO sessions (id, bank_id) VALUES (?, ?)", session.ID, session.QuestionBankId)
	if err != nil {
		return err
	}

	for i, q := range session.Questions {
		_, err = tx.Exec(
			"INSERT INTO session_questions (session_id, question_id, question_subject, expected_answer, position) VALUES (?, ?, ?, ?, ?)",
			session.ID, q.ID, q.Subject, q.ExpectedAnswer, i,
		)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	s.mu.Lock()
	s.gradeWg[session.ID] = &sync.WaitGroup{}
	s.mu.Unlock()

	return nil
}

func (s *SQLiteStore) GetSession(id string) (*practicesession.PracticeSession, error) {
	var session practicesession.PracticeSession
	var bankID string

	err := s.db.QueryRow("SELECT id, bank_id FROM sessions WHERE id = ?", id).Scan(&session.ID, &bankID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	session.QuestionBankId = bankID

	rows, err := s.db.Query(
		"SELECT question_id, question_subject, expected_answer FROM session_questions WHERE session_id = ? ORDER BY position",
		id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var q questionbank.Question
		if err := rows.Scan(&q.ID, &q.Subject, &q.ExpectedAnswer); err != nil {
			return nil, err
		}
		session.Questions = append(session.Questions, q)
	}

	return &session, nil
}

// ============================================================================
// Grades
// ============================================================================

func (s *SQLiteStore) SaveGrade(sessionID string, questionID string, score int, covered, missed []string) error {
	coveredJSON, _ := json.Marshal(covered)
	missedJSON, _ := json.Marshal(missed)

	_, err := s.db.Exec(
		"INSERT INTO grades (session_id, question_id, score, covered, missed) VALUES (?, ?, ?, ?, ?)",
		sessionID, questionID, score, string(coveredJSON), string(missedJSON),
	)
	return err
}

func (s *SQLiteStore) GetGrades(sessionID string) ([]StoredGrade, error) {
	rows, err := s.db.Query(
		"SELECT question_id, score, covered, missed FROM grades WHERE session_id = ?",
		sessionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var grades []StoredGrade
	for rows.Next() {
		var g StoredGrade
		var coveredJSON, missedJSON string
		if err := rows.Scan(&g.QuestionID, &g.Score, &coveredJSON, &missedJSON); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(coveredJSON), &g.Covered)
		json.Unmarshal([]byte(missedJSON), &g.Missed)
		grades = append(grades, g)
	}
	return grades, nil
}

func (s *SQLiteStore) GetWaitGroup(sessionID string) *sync.WaitGroup {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.gradeWg[sessionID]
}

func (s *SQLiteStore) AddToWaitGroup(sessionID string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if wg, ok := s.gradeWg[sessionID]; ok {
		wg.Add(1)
	}
}

func (s *SQLiteStore) DoneWaitGroup(sessionID string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if wg, ok := s.gradeWg[sessionID]; ok {
		wg.Done()
	}
}
