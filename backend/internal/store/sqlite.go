// internal/store/sqlite.go
package store

import (
	"context"
	"database/sql"
	"encoding/json"

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
    grading_prompt TEXT,
    bank_type TEXT NOT NULL DEFAULT 'theory',
    language TEXT,
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
    user_answer TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'success',
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS question_stats (
    question_id TEXT PRIMARY KEY,
    times_answered INTEGER NOT NULL DEFAULT 0,
    times_correct INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    latest_score INTEGER NOT NULL DEFAULT 0,
    mastery INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
`

// migrations adds columns that may not exist in older databases.
const migrations = `
-- Add status column if it doesn't exist (SQLite doesn't support IF NOT EXISTS for columns,
-- so we catch the error in Go).
`

type SQLiteStore struct {
	db *sql.DB
}

// Compile-time check: *SQLiteStore must satisfy the Store interface.
var _ Store = (*SQLiteStore)(nil)

func NewSQLite(dbPath string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	// Run migrations — add status column if missing
	_ = addColumnIfNotExists(db, "grades", "status", "TEXT NOT NULL DEFAULT 'success'")

	return &SQLiteStore{
		db: db,
	}, nil
}

// addColumnIfNotExists tries to add a column; ignores the error if it already exists.
func addColumnIfNotExists(db *sql.DB, table, column, definition string) error {
	query := "ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition
	_, err := db.Exec(query)
	if err != nil {
		// SQLite returns "duplicate column name" if it already exists — that's fine.
		if isColumnExistsError(err) {
			return nil
		}
		return err
	}
	return nil
}

func isColumnExistsError(err error) bool {
	return err != nil && (contains(err.Error(), "duplicate column") || contains(err.Error(), "already exists"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// ============================================================================
// Categories
// ============================================================================

func (s *SQLiteStore) SaveCategory(ctx context.Context, cat *category.Category) error {
	_, err := s.db.ExecContext(ctx, "INSERT INTO categories (id, name) VALUES (?, ?)", cat.ID, cat.Name)
	return err
}

func (s *SQLiteStore) GetCategory(ctx context.Context, id string) (*category.Category, error) {
	var cat category.Category
	err := s.db.QueryRowContext(ctx, "SELECT id, name FROM categories WHERE id = ?", id).Scan(&cat.ID, &cat.Name)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (s *SQLiteStore) ListCategories(ctx context.Context) ([]*category.Category, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name FROM categories")
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

func (s *SQLiteStore) UpdateCategory(ctx context.Context, cat *category.Category) error {
	result, err := s.db.ExecContext(ctx, "UPDATE categories SET name = ? WHERE id = ?", cat.Name, cat.ID)
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

func (s *SQLiteStore) DeleteCategory(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// First, delete question stats for questions in banks of this category
	_, err = tx.ExecContext(ctx, `
		DELETE FROM question_stats 
		WHERE question_id IN (
			SELECT q.id FROM questions q
			JOIN banks b ON q.bank_id = b.id
			WHERE b.category_id = ?
		)
	`, id)
	if err != nil {
		return err
	}

	// Delete all questions belonging to banks in this category
	_, err = tx.ExecContext(ctx, `
		DELETE FROM questions 
		WHERE bank_id IN (SELECT id FROM banks WHERE category_id = ?)
	`, id)
	if err != nil {
		return err
	}

	// Then, delete all banks in this category
	_, err = tx.ExecContext(ctx, "DELETE FROM banks WHERE category_id = ?", id)
	if err != nil {
		return err
	}

	// Finally, delete the category itself
	result, err := tx.ExecContext(ctx, "DELETE FROM categories WHERE id = ?", id)
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

func (s *SQLiteStore) SaveBank(ctx context.Context, bank *questionbank.QuestionBank) error {
	_, err := s.db.ExecContext(ctx, "INSERT INTO banks (id, subject, category_id, grading_prompt, bank_type, language) VALUES (?, ?, ?, ?, ?, ?)", bank.ID, bank.Subject, bank.CategoryID, bank.GradingPrompt, bank.BankType, bank.Language)
	return err
}

func (s *SQLiteStore) GetBank(ctx context.Context, id string) (*questionbank.QuestionBank, error) {
	var bank questionbank.QuestionBank
	var categoryID sql.NullString
	var gradingPrompt sql.NullString
	var bankType sql.NullString
	var language sql.NullString

	err := s.db.QueryRowContext(ctx, "SELECT id, subject, category_id, grading_prompt, bank_type, language FROM banks WHERE id = ?", id).Scan(&bank.ID, &bank.Subject, &categoryID, &gradingPrompt, &bankType, &language)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if categoryID.Valid {
		bank.CategoryID = &categoryID.String
	}
	if gradingPrompt.Valid {
		bank.GradingPrompt = &gradingPrompt.String
	}
	if bankType.Valid {
		bank.BankType = questionbank.BankType(bankType.String)
	} else {
		bank.BankType = questionbank.BankTypeTheory
	}
	if language.Valid {
		bank.Language = &language.String
	}

	rows, err := s.db.QueryContext(ctx, "SELECT id, subject, expected_answer FROM questions WHERE bank_id = ?", id)
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

func (s *SQLiteStore) ListBanks(ctx context.Context) ([]*questionbank.QuestionBank, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, subject, category_id, grading_prompt, bank_type, language FROM banks")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []*questionbank.QuestionBank
	for rows.Next() {
		var bank questionbank.QuestionBank
		var categoryID sql.NullString
		var gradingPrompt sql.NullString
		var bankType sql.NullString
		var language sql.NullString
		if err := rows.Scan(&bank.ID, &bank.Subject, &categoryID, &gradingPrompt, &bankType, &language); err != nil {
			return nil, err
		}
		if categoryID.Valid {
			bank.CategoryID = &categoryID.String
		}
		if gradingPrompt.Valid {
			bank.GradingPrompt = &gradingPrompt.String
		}
		if bankType.Valid {
			bank.BankType = questionbank.BankType(bankType.String)
		} else {
			bank.BankType = questionbank.BankTypeTheory
		}
		if language.Valid {
			bank.Language = &language.String
		}
		banks = append(banks, &bank)
	}
	return banks, nil
}

func (s *SQLiteStore) ListBanksByCategory(ctx context.Context, categoryID string) ([]*questionbank.QuestionBank, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, subject, category_id, grading_prompt, bank_type, language FROM banks WHERE category_id = ?", categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []*questionbank.QuestionBank
	for rows.Next() {
		var bank questionbank.QuestionBank
		var catID sql.NullString
		var gradingPrompt sql.NullString
		var bankType sql.NullString
		var language sql.NullString
		if err := rows.Scan(&bank.ID, &bank.Subject, &catID, &gradingPrompt, &bankType, &language); err != nil {
			return nil, err
		}
		if catID.Valid {
			bank.CategoryID = &catID.String
		}
		if gradingPrompt.Valid {
			bank.GradingPrompt = &gradingPrompt.String
		}
		if bankType.Valid {
			bank.BankType = questionbank.BankType(bankType.String)
		} else {
			bank.BankType = questionbank.BankTypeTheory
		}
		if language.Valid {
			bank.Language = &language.String
		}
		banks = append(banks, &bank)
	}
	return banks, nil
}

func (s *SQLiteStore) ListUncategorizedBanks(ctx context.Context) ([]*questionbank.QuestionBank, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, subject, category_id, grading_prompt, bank_type, language FROM banks WHERE category_id IS NULL")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banks []*questionbank.QuestionBank
	for rows.Next() {
		var bank questionbank.QuestionBank
		var categoryID sql.NullString
		var gradingPrompt sql.NullString
		var bankType sql.NullString
		var language sql.NullString
		if err := rows.Scan(&bank.ID, &bank.Subject, &categoryID, &gradingPrompt, &bankType, &language); err != nil {
			return nil, err
		}
		if gradingPrompt.Valid {
			bank.GradingPrompt = &gradingPrompt.String
		}
		if bankType.Valid {
			bank.BankType = questionbank.BankType(bankType.String)
		} else {
			bank.BankType = questionbank.BankTypeTheory
		}
		if language.Valid {
			bank.Language = &language.String
		}
		banks = append(banks, &bank)
	}
	return banks, nil
}

func (s *SQLiteStore) UpdateBankCategory(ctx context.Context, bankID string, categoryID *string) error {
	result, err := s.db.ExecContext(ctx, "UPDATE banks SET category_id = ? WHERE id = ?", categoryID, bankID)
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

func (s *SQLiteStore) UpdateBankGradingPrompt(ctx context.Context, bankID string, gradingPrompt *string) error {
	result, err := s.db.ExecContext(ctx, "UPDATE banks SET grading_prompt = ? WHERE id = ?", gradingPrompt, bankID)
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

func (s *SQLiteStore) DeleteBank(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete question stats for questions in this bank
	_, err = tx.ExecContext(ctx, `
		DELETE FROM question_stats 
		WHERE question_id IN (SELECT id FROM questions WHERE bank_id = ?)
	`, id)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "DELETE FROM questions WHERE bank_id = ?", id)
	if err != nil {
		return err
	}

	result, err := tx.ExecContext(ctx, "DELETE FROM banks WHERE id = ?", id)
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

func (s *SQLiteStore) AddQuestion(ctx context.Context, bankID string, question questionbank.Question) error {
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO questions (id, bank_id, subject, expected_answer) VALUES (?, ?, ?, ?)",
		question.ID, bankID, question.Subject, question.ExpectedAnswer,
	)
	return err
}

func (s *SQLiteStore) DeleteQuestion(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete question stats first
	_, err = tx.ExecContext(ctx, "DELETE FROM question_stats WHERE question_id = ?", id)
	if err != nil {
		return err
	}

	result, err := tx.ExecContext(ctx, "DELETE FROM questions WHERE id = ?", id)
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
// Sessions
// ============================================================================

func (s *SQLiteStore) SaveSession(ctx context.Context, session *practicesession.PracticeSession) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, "INSERT INTO sessions (id, bank_id) VALUES (?, ?)", session.ID, session.QuestionBankId)
	if err != nil {
		return err
	}

	for i, q := range session.Questions {
		_, err = tx.ExecContext(ctx,
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

	return nil
}

func (s *SQLiteStore) GetSession(ctx context.Context, id string) (*practicesession.PracticeSession, error) {
	var session practicesession.PracticeSession
	var bankID string

	err := s.db.QueryRowContext(ctx, "SELECT id, bank_id FROM sessions WHERE id = ?", id).Scan(&session.ID, &bankID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	session.QuestionBankId = bankID

	rows, err := s.db.QueryContext(ctx,
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

// SaveGrade stores a successful grading result.
func (s *SQLiteStore) SaveGrade(ctx context.Context, sessionID string, questionID string, score int, covered, missed []string, userAnswer string) error {
	coveredJSON, _ := json.Marshal(covered)
	missedJSON, _ := json.Marshal(missed)

	_, err := s.db.ExecContext(ctx,
		"INSERT INTO grades (session_id, question_id, score, covered, missed, user_answer, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
		sessionID, questionID, score, string(coveredJSON), string(missedJSON), userAnswer, GradeStatusSuccess,
	)
	if err != nil {
		return err
	}

	// Update question statistics
	return s.updateQuestionStats(ctx, questionID, score)
}

// SaveGradeFailure stores a record when grading fails, so the user sees
// "grading failed" instead of "not answered."
func (s *SQLiteStore) SaveGradeFailure(ctx context.Context, sessionID string, questionID string, userAnswer string, reason string) error {
	missed := []string{"Grading failed: " + reason}
	missedJSON, _ := json.Marshal(missed)
	coveredJSON, _ := json.Marshal([]string{})

	_, err := s.db.ExecContext(ctx,
		"INSERT INTO grades (session_id, question_id, score, covered, missed, user_answer, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
		sessionID, questionID, 0, string(coveredJSON), string(missedJSON), userAnswer, GradeStatusFailed,
	)
	return err
}

func (s *SQLiteStore) GetGrades(ctx context.Context, sessionID string) ([]StoredGrade, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT question_id, score, covered, missed, user_answer, COALESCE(status, 'success') FROM grades WHERE session_id = ?",
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
		var status string
		if err := rows.Scan(&g.QuestionID, &g.Score, &coveredJSON, &missedJSON, &g.UserAnswer, &status); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(coveredJSON), &g.Covered)
		json.Unmarshal([]byte(missedJSON), &g.Missed)
		g.Status = GradeStatus(status)
		grades = append(grades, g)
	}
	return grades, nil
}

// ============================================================================
// Question Statistics
// ============================================================================

func (s *SQLiteStore) updateQuestionStats(ctx context.Context, questionID string, score int) error {
	// Check if stats exist
	var exists bool
	err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM question_stats WHERE question_id = ?)", questionID).Scan(&exists)
	if err != nil {
		return err
	}

	isCorrect := 0
	if score >= 70 {
		isCorrect = 1
	}

	if exists {
		// Update existing stats
		// Mastery formula (Option 3): latest_score * 0.6 + historical_average * 0.4
		// historical_average = total_score / times_answered (before adding new score)
		_, err = s.db.ExecContext(ctx, `
			UPDATE question_stats 
			SET times_answered = times_answered + 1,
			    times_correct = times_correct + ?,
			    total_score = total_score + ?,
			    latest_score = ?,
			    mastery = CAST(
			        ? * 0.6 + 
			        (CAST(total_score AS REAL) / times_answered) * 0.4
			    AS INTEGER)
			WHERE question_id = ?
		`, isCorrect, score, score, score, questionID)
	} else {
		// Insert new stats - first attempt, so mastery = latest score
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO question_stats (question_id, times_answered, times_correct, total_score, latest_score, mastery)
			VALUES (?, 1, ?, ?, ?, ?)
		`, questionID, isCorrect, score, score, score)
	}

	return err
}

func (s *SQLiteStore) GetQuestionStats(ctx context.Context, questionID string) (*questionbank.QuestionStats, error) {
	var stats questionbank.QuestionStats
	err := s.db.QueryRowContext(ctx, `
		SELECT question_id, times_answered, times_correct, total_score, latest_score, mastery
		FROM question_stats WHERE question_id = ?
	`, questionID).Scan(&stats.QuestionID, &stats.TimesAnswered, &stats.TimesCorrect, &stats.TotalScore, &stats.LatestScore, &stats.Mastery)

	if err == sql.ErrNoRows {
		// Return zero stats for unanswered questions
		return &questionbank.QuestionStats{QuestionID: questionID}, nil
	}
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (s *SQLiteStore) GetQuestionStatsByBank(ctx context.Context, bankID string) ([]questionbank.QuestionStats, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT q.id, COALESCE(qs.times_answered, 0), COALESCE(qs.times_correct, 0), 
		       COALESCE(qs.total_score, 0), COALESCE(qs.latest_score, 0), COALESCE(qs.mastery, 0)
		FROM questions q
		LEFT JOIN question_stats qs ON q.id = qs.question_id
		WHERE q.bank_id = ?
	`, bankID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []questionbank.QuestionStats
	for rows.Next() {
		var s questionbank.QuestionStats
		if err := rows.Scan(&s.QuestionID, &s.TimesAnswered, &s.TimesCorrect, &s.TotalScore, &s.LatestScore, &s.Mastery); err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}
	return stats, nil
}

func (s *SQLiteStore) GetBankMastery(ctx context.Context, bankID string) (int, error) {
	var mastery sql.NullFloat64
	err := s.db.QueryRowContext(ctx, `
		SELECT AVG(COALESCE(qs.mastery, 0))
		FROM questions q
		LEFT JOIN question_stats qs ON q.id = qs.question_id
		WHERE q.bank_id = ?
	`, bankID).Scan(&mastery)

	if err != nil {
		return 0, err
	}
	if !mastery.Valid {
		return 0, nil
	}
	return int(mastery.Float64), nil
}

func (s *SQLiteStore) GetCategoryMastery(ctx context.Context, categoryID string) (int, error) {
	var mastery sql.NullFloat64
	err := s.db.QueryRowContext(ctx, `
		SELECT AVG(COALESCE(qs.mastery, 0))
		FROM questions q
		JOIN banks b ON q.bank_id = b.id
		LEFT JOIN question_stats qs ON q.id = qs.question_id
		WHERE b.category_id = ?
	`, categoryID).Scan(&mastery)

	if err != nil {
		return 0, err
	}
	if !mastery.Valid {
		return 0, nil
	}
	return int(mastery.Float64), nil
}

// GetQuestionsOrderedByMastery returns questions sorted by mastery (lowest first for weak focus)
func (s *SQLiteStore) GetQuestionsOrderedByMastery(ctx context.Context, bankID string, ascending bool) ([]questionbank.Question, error) {
	order := "ASC"
	if !ascending {
		order = "DESC"
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT q.id, q.subject, q.expected_answer, COALESCE(qs.mastery, 0) as mastery
		FROM questions q
		LEFT JOIN question_stats qs ON q.id = qs.question_id
		WHERE q.bank_id = ?
		ORDER BY mastery `+order, bankID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []questionbank.Question
	for rows.Next() {
		var q questionbank.Question
		var mastery int
		if err := rows.Scan(&q.ID, &q.Subject, &q.ExpectedAnswer, &mastery); err != nil {
			return nil, err
		}
		questions = append(questions, q)
	}
	return questions, nil
}
