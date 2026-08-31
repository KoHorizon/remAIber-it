package store_test

import (
	"context"
	"testing"

	"github.com/remaimber-it/backend/internal/domain/category"
	"github.com/remaimber-it/backend/internal/domain/folder"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/store"
)

func newTestStore(t *testing.T) *store.SQLiteStore {
	t.Helper()
	s, err := store.NewSQLite(":memory:")
	if err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

// ============================================================================
// Categories
// ============================================================================

func TestSaveAndGetCategory(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	cat := category.New("Golang")
	if err := s.SaveCategory(ctx, cat); err != nil {
		t.Fatalf("SaveCategory: %v", err)
	}

	got, err := s.GetCategory(ctx, cat.ID)
	if err != nil {
		t.Fatalf("GetCategory: %v", err)
	}
	if got.Name != "Golang" {
		t.Errorf("expected name %q, got %q", "Golang", got.Name)
	}
	if got.FolderID != nil {
		t.Errorf("expected nil FolderID, got %v", got.FolderID)
	}
}

func TestGetCategory_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.GetCategory(ctx, "nonexistent")
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestListCategories(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	for _, name := range []string{"Go", "Rust", "Python"} {
		if err := s.SaveCategory(ctx, category.New(name)); err != nil {
			t.Fatalf("SaveCategory: %v", err)
		}
	}

	cats, err := s.ListCategories(ctx)
	if err != nil {
		t.Fatalf("ListCategories: %v", err)
	}
	if len(cats) != 3 {
		t.Errorf("expected 3 categories, got %d", len(cats))
	}
}

func TestUpdateCategory(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	cat := category.New("Old Name")
	s.SaveCategory(ctx, cat)

	cat.Name = "New Name"
	if err := s.UpdateCategory(ctx, cat); err != nil {
		t.Fatalf("UpdateCategory: %v", err)
	}

	got, _ := s.GetCategory(ctx, cat.ID)
	if got.Name != "New Name" {
		t.Errorf("expected %q, got %q", "New Name", got.Name)
	}
}

func TestUpdateCategory_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	err := s.UpdateCategory(ctx, &category.Category{ID: "ghost", Name: "X"})
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestDeleteCategory_CascadesBank(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	cat := category.New("Go")
	s.SaveCategory(ctx, cat)

	bank := questionbank.NewWithCategory("Concurrency", cat.ID)
	s.SaveBank(ctx, bank)

	if err := s.DeleteCategory(ctx, cat.ID); err != nil {
		t.Fatalf("DeleteCategory: %v", err)
	}

	// Bank should be gone too
	_, err := s.GetBank(ctx, bank.ID)
	if err != store.ErrNotFound {
		t.Errorf("expected bank to be deleted, got err=%v", err)
	}
}

// ============================================================================
// Banks
// ============================================================================

func TestSaveAndGetBank(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	cat := category.New("Go")
	s.SaveCategory(ctx, cat)

	bank := questionbank.NewWithCategory("Concurrency", cat.ID)
	bank.AddQuestion("What is a goroutine?", "Lightweight thread")

	if err := s.SaveBank(ctx, bank); err != nil {
		t.Fatalf("SaveBank: %v", err)
	}
	if err := s.AddQuestion(ctx, bank.ID, bank.Questions[0]); err != nil {
		t.Fatalf("AddQuestion: %v", err)
	}

	got, err := s.GetBank(ctx, bank.ID)
	if err != nil {
		t.Fatalf("GetBank: %v", err)
	}
	if got.Subject != "Concurrency" {
		t.Errorf("expected subject %q, got %q", "Concurrency", got.Subject)
	}
	if len(got.Questions) != 1 {
		t.Errorf("expected 1 question, got %d", len(got.Questions))
	}
}

func TestGetBank_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.GetBank(ctx, "nonexistent")
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestDeleteBank_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	err := s.DeleteBank(ctx, "ghost")
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}


// ============================================================================
// Questions
// ============================================================================

func TestAddAndDeleteQuestion(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	s.SaveBank(ctx, bank)
	bank.AddQuestion("Q1", "A1")
	q := bank.Questions[0]

	if err := s.AddQuestion(ctx, bank.ID, q); err != nil {
		t.Fatalf("AddQuestion: %v", err)
	}

	got, _ := s.GetBank(ctx, bank.ID)
	if len(got.Questions) != 1 {
		t.Errorf("expected 1 question, got %d", len(got.Questions))
	}

	if err := s.DeleteQuestion(ctx, q.ID); err != nil {
		t.Fatalf("DeleteQuestion: %v", err)
	}

	got, _ = s.GetBank(ctx, bank.ID)
	if len(got.Questions) != 0 {
		t.Errorf("expected 0 questions after delete, got %d", len(got.Questions))
	}
}

func TestDeleteQuestion_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	err := s.DeleteQuestion(ctx, "ghost")
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ============================================================================
// Folders
// ============================================================================

func TestSaveAndGetFolder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	f := folder.New("Programming")
	if err := s.SaveFolder(ctx, f); err != nil {
		t.Fatalf("SaveFolder: %v", err)
	}

	got, err := s.GetFolder(ctx, f.ID)
	if err != nil {
		t.Fatalf("GetFolder: %v", err)
	}
	if got.Name != "Programming" {
		t.Errorf("expected %q, got %q", "Programming", got.Name)
	}
	if got.IsSystem {
		t.Error("expected IsSystem=false for user folder")
	}
}

func TestGetFolder_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	_, err := s.GetFolder(ctx, "nonexistent")
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestUpdateFolder_SystemFolderRejected(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	deleted, err := s.GetOrCreateDeletedFolder(ctx)
	if err != nil {
		t.Fatalf("GetOrCreateDeletedFolder: %v", err)
	}

	err = s.UpdateFolder(ctx, &folder.Folder{ID: deleted.ID, Name: "Hacked"})
	if err != store.ErrSystemFolder {
		t.Errorf("expected ErrSystemFolder, got %v", err)
	}
}

func TestDeleteFolder_MovesCategoriesToDeleted(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	f := folder.New("Work")
	s.SaveFolder(ctx, f)

	cat := category.New("Go")
	cat.FolderID = &f.ID
	s.SaveCategory(ctx, cat)

	if err := s.DeleteFolder(ctx, f.ID); err != nil {
		t.Fatalf("DeleteFolder: %v", err)
	}

	// Category should still exist (moved to Deleted folder)
	got, err := s.GetCategory(ctx, cat.ID)
	if err != nil {
		t.Fatalf("category should still exist after folder delete: %v", err)
	}
	if got.FolderID == nil {
		t.Error("expected category to be moved to Deleted folder, got nil FolderID")
	}
}

// TestDeleteFolder_EmptyingTrashPreservesContent covers the second branch of
// DeleteFolder, on the system "Deleted" folder. It reads like emptying a trash
// can, and the docs used to claim it cascade-deleted everything inside, but it
// only unfiles the categories — no bank, question or stat row is removed.
func TestDeleteFolder_EmptyingTrashPreservesContent(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	f := folder.New("Work")
	if err := s.SaveFolder(ctx, f); err != nil {
		t.Fatalf("SaveFolder: %v", err)
	}

	cat := category.New("Go")
	cat.FolderID = &f.ID
	if err := s.SaveCategory(ctx, cat); err != nil {
		t.Fatalf("SaveCategory: %v", err)
	}

	bank := questionbank.NewWithCategory("Concurrency", cat.ID)
	if err := bank.AddQuestion("What is a goroutine?", "A lightweight thread"); err != nil {
		t.Fatalf("AddQuestion: %v", err)
	}
	if err := s.SaveBank(ctx, bank); err != nil {
		t.Fatalf("SaveBank: %v", err)
	}
	questionID := bank.Questions[0].ID
	if err := s.AddQuestion(ctx, bank.ID, bank.Questions[0]); err != nil {
		t.Fatalf("store AddQuestion: %v", err)
	}

	// First delete sends the category to the "Deleted" folder.
	if err := s.DeleteFolder(ctx, f.ID); err != nil {
		t.Fatalf("DeleteFolder(regular): %v", err)
	}
	deleted, err := s.GetOrCreateDeletedFolder(ctx)
	if err != nil {
		t.Fatalf("GetOrCreateDeletedFolder: %v", err)
	}

	// Second delete "empties the trash".
	if err := s.DeleteFolder(ctx, deleted.ID); err != nil {
		t.Fatalf("DeleteFolder(deleted): %v", err)
	}

	gotCat, err := s.GetCategory(ctx, cat.ID)
	if err != nil {
		t.Fatalf("category should survive emptying the trash: %v", err)
	}
	if gotCat.FolderID != nil {
		t.Errorf("expected category unfiled (nil FolderID), got %q", *gotCat.FolderID)
	}

	gotBank, err := s.GetBank(ctx, bank.ID)
	if err != nil {
		t.Fatalf("bank should survive emptying the trash: %v", err)
	}
	if len(gotBank.Questions) != 1 {
		t.Errorf("expected the question to survive, got %d questions", len(gotBank.Questions))
	}
	if _, err := s.GetQuestionStats(ctx, questionID); err != nil {
		t.Errorf("question stats should survive emptying the trash: %v", err)
	}

	// The folder row itself is gone, and is recreated lazily on the next delete.
	if _, err := s.GetFolder(ctx, deleted.ID); err != store.ErrNotFound {
		t.Errorf("expected the Deleted folder row to be gone, got %v", err)
	}
}

func TestListCategoriesByFolder(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	f := folder.New("Work")
	s.SaveFolder(ctx, f)

	for _, name := range []string{"Go", "Rust"} {
		cat := category.NewWithFolder(name, f.ID)
		s.SaveCategory(ctx, cat)
	}
	// Category in no folder — should not appear
	s.SaveCategory(ctx, category.New("Unfiled"))

	cats, err := s.ListCategoriesByFolder(ctx, f.ID)
	if err != nil {
		t.Fatalf("ListCategoriesByFolder: %v", err)
	}
	if len(cats) != 2 {
		t.Errorf("expected 2 categories, got %d", len(cats))
	}
}

// ============================================================================
// Sessions & Grades
// ============================================================================

func TestSaveAndGetSession(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	s.SaveBank(ctx, bank)
	bank.AddQuestion("Q1", "A1")
	s.AddQuestion(ctx, bank.ID, bank.Questions[0])

	full, _ := s.GetBank(ctx, bank.ID)
	session := practicesession.New(full)

	if err := s.SaveSession(ctx, session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}

	got, err := s.GetSession(ctx, session.ID)
	if err != nil {
		t.Fatalf("GetSession: %v", err)
	}
	if got.ID != session.ID {
		t.Errorf("expected session ID %q, got %q", session.ID, got.ID)
	}
	if len(got.Questions) != 1 {
		t.Errorf("expected 1 question in session, got %d", len(got.Questions))
	}
}

func TestCompleteSession(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	bank.AddQuestion("Q1", "A1")
	s.SaveBank(ctx, bank)
	s.AddQuestion(ctx, bank.ID, bank.Questions[0])

	full, _ := s.GetBank(ctx, bank.ID)
	session := practicesession.New(full)
	s.SaveSession(ctx, session)

	if err := s.CompleteSession(ctx, session.ID); err != nil {
		t.Fatalf("CompleteSession: %v", err)
	}

	// Second complete should return ErrSessionCompleted
	err := s.CompleteSession(ctx, session.ID)
	if err != store.ErrSessionCompleted {
		t.Errorf("expected ErrSessionCompleted, got %v", err)
	}
}

func TestCompleteSession_NotFound(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	err := s.CompleteSession(ctx, "ghost")
	if err != store.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestSaveGradeAndGetGrades(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	bank.AddQuestion("Q1", "A1")
	s.SaveBank(ctx, bank)
	s.AddQuestion(ctx, bank.ID, bank.Questions[0])

	full, _ := s.GetBank(ctx, bank.ID)
	session := practicesession.New(full)
	s.SaveSession(ctx, session)

	q := session.Questions[0]
	err := s.SaveGrade(ctx, session.ID, q.ID, 80, []string{"concept A"}, []string{"concept B"}, "my answer")
	if err != nil {
		t.Fatalf("SaveGrade: %v", err)
	}

	grades, err := s.GetGrades(ctx, session.ID)
	if err != nil {
		t.Fatalf("GetGrades: %v", err)
	}
	if len(grades) != 1 {
		t.Fatalf("expected 1 grade, got %d", len(grades))
	}
	g := grades[0]
	if g.Score != 80 {
		t.Errorf("expected score 80, got %d", g.Score)
	}
	if g.UserAnswer != "my answer" {
		t.Errorf("expected user answer %q, got %q", "my answer", g.UserAnswer)
	}
	if g.Status != store.GradeStatusSuccess {
		t.Errorf("expected status success, got %v", g.Status)
	}
}

func TestSaveGrade_Upsert(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	bank.AddQuestion("Q1", "A1")
	s.SaveBank(ctx, bank)
	s.AddQuestion(ctx, bank.ID, bank.Questions[0])

	full, _ := s.GetBank(ctx, bank.ID)
	session := practicesession.New(full)
	s.SaveSession(ctx, session)

	q := session.Questions[0]
	s.SaveGrade(ctx, session.ID, q.ID, 60, nil, nil, "first")
	s.SaveGrade(ctx, session.ID, q.ID, 90, nil, nil, "second")

	grades, _ := s.GetGrades(ctx, session.ID)
	if len(grades) != 1 {
		t.Fatalf("expected upsert to keep 1 grade, got %d", len(grades))
	}
	if grades[0].Score != 90 {
		t.Errorf("expected updated score 90, got %d", grades[0].Score)
	}
}

func TestSaveGradeFailure(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	bank.AddQuestion("Q1", "A1")
	s.SaveBank(ctx, bank)
	s.AddQuestion(ctx, bank.ID, bank.Questions[0])

	full, _ := s.GetBank(ctx, bank.ID)
	session := practicesession.New(full)
	s.SaveSession(ctx, session)

	q := session.Questions[0]
	if err := s.SaveGradeFailure(ctx, session.ID, q.ID, "my answer", "LLM timeout"); err != nil {
		t.Fatalf("SaveGradeFailure: %v", err)
	}

	grades, _ := s.GetGrades(ctx, session.ID)
	if len(grades) != 1 {
		t.Fatalf("expected 1 grade, got %d", len(grades))
	}
	if grades[0].Status != store.GradeStatusFailed {
		t.Errorf("expected status failed, got %v", grades[0].Status)
	}
	if grades[0].Score != 0 {
		t.Errorf("expected score 0 for failure, got %d", grades[0].Score)
	}
}

// ============================================================================
// Mastery batch queries
// ============================================================================

func seedBankWithScore(t *testing.T, s *store.SQLiteStore, ctx context.Context, catID string, score int) string {
	t.Helper()
	bank := questionbank.NewWithCategory("Bank", catID)
	s.SaveBank(ctx, bank)
	bank.AddQuestion("Q", "A")
	q := bank.Questions[0]
	s.AddQuestion(ctx, bank.ID, q)

	full, _ := s.GetBank(ctx, bank.ID)
	session := practicesession.New(full)
	s.SaveSession(ctx, session)
	s.SaveGrade(ctx, session.ID, q.ID, score, nil, nil, "answer")
	return bank.ID
}

func TestGetBankMasteryBatch(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	cat := category.New("Go")
	s.SaveCategory(ctx, cat)

	id1 := seedBankWithScore(t, s, ctx, cat.ID, 80)
	id2 := seedBankWithScore(t, s, ctx, cat.ID, 40)

	result, err := s.GetBankMasteryBatch(ctx, []string{id1, id2})
	if err != nil {
		t.Fatalf("GetBankMasteryBatch: %v", err)
	}
	if _, ok := result[id1]; !ok {
		t.Errorf("expected mastery entry for bank %s", id1)
	}
	if _, ok := result[id2]; !ok {
		t.Errorf("expected mastery entry for bank %s", id2)
	}
}

func TestGetBankMasteryBatch_Empty(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	result, err := s.GetBankMasteryBatch(ctx, []string{})
	if err != nil {
		t.Fatalf("GetBankMasteryBatch empty: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty map, got %d entries", len(result))
	}
}

func TestGetCategoryMasteryBatch(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	cat1 := category.New("Go")
	cat2 := category.New("Rust")
	s.SaveCategory(ctx, cat1)
	s.SaveCategory(ctx, cat2)

	seedBankWithScore(t, s, ctx, cat1.ID, 100)
	seedBankWithScore(t, s, ctx, cat2.ID, 20)

	result, err := s.GetCategoryMasteryBatch(ctx, []string{cat1.ID, cat2.ID})
	if err != nil {
		t.Fatalf("GetCategoryMasteryBatch: %v", err)
	}
	if _, ok := result[cat1.ID]; !ok {
		t.Errorf("expected mastery for category %s", cat1.ID)
	}
	if _, ok := result[cat2.ID]; !ok {
		t.Errorf("expected mastery for category %s", cat2.ID)
	}
}

func TestGetFolderMasteryBatch(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	f1 := folder.New("Work")
	f2 := folder.New("Personal")
	s.SaveFolder(ctx, f1)
	s.SaveFolder(ctx, f2)

	cat1 := category.NewWithFolder("Go", f1.ID)
	cat2 := category.NewWithFolder("Rust", f2.ID)
	s.SaveCategory(ctx, cat1)
	s.SaveCategory(ctx, cat2)

	seedBankWithScore(t, s, ctx, cat1.ID, 75)
	seedBankWithScore(t, s, ctx, cat2.ID, 50)

	result, err := s.GetFolderMasteryBatch(ctx, []string{f1.ID, f2.ID})
	if err != nil {
		t.Fatalf("GetFolderMasteryBatch: %v", err)
	}
	if _, ok := result[f1.ID]; !ok {
		t.Errorf("expected mastery for folder %s", f1.ID)
	}
	if _, ok := result[f2.ID]; !ok {
		t.Errorf("expected mastery for folder %s", f2.ID)
	}
}

func TestGetFolderMasteryBatch_Empty(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	result, err := s.GetFolderMasteryBatch(ctx, []string{})
	if err != nil {
		t.Fatalf("GetFolderMasteryBatch empty: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty map, got %d entries", len(result))
	}
}

// ============================================================================
// validIdentifier guard
// ============================================================================

func TestValidIdentifier_Panics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic for invalid identifier, got none")
		}
	}()
	// Passing an identifier with a semicolon should panic before touching the DB
	store.ExposedAddColumnIfNotExists(nil, "bad;table", "col", "TEXT")
}

// ============================================================================
// Question stats / mastery persistence
// ============================================================================

// seedGradableQuestion returns a session and the question inside it, ready for
// SaveGrade calls.
func seedGradableQuestion(t *testing.T, s *store.SQLiteStore, ctx context.Context) (string, string) {
	t.Helper()

	bank := questionbank.New("Test")
	if err := bank.AddQuestion("Q1", "A1"); err != nil {
		t.Fatalf("AddQuestion: %v", err)
	}
	if err := s.SaveBank(ctx, bank); err != nil {
		t.Fatalf("SaveBank: %v", err)
	}
	if err := s.AddQuestion(ctx, bank.ID, bank.Questions[0]); err != nil {
		t.Fatalf("store AddQuestion: %v", err)
	}

	full, err := s.GetBank(ctx, bank.ID)
	if err != nil {
		t.Fatalf("GetBank: %v", err)
	}
	session := practicesession.New(full)
	if err := s.SaveSession(ctx, session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}

	return session.ID, session.Questions[0].ID
}

// TestSaveGrade_MasteryMatchesDomain is the regression guard for the store
// reimplementing the mastery formula in SQL. The persisted value must equal what
// questionbank.QuestionStats computes for the same sequence of scores.
func TestSaveGrade_MasteryMatchesDomain(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	sessionID, questionID := seedGradableQuestion(t, s, ctx)

	var expected questionbank.QuestionStats
	for _, score := range []int{60, 90, 40, 100} {
		if err := s.SaveGrade(ctx, sessionID, questionID, score, nil, nil, "answer"); err != nil {
			t.Fatalf("SaveGrade(%d): %v", score, err)
		}
		expected.RecordScore(score)

		got, err := s.GetQuestionStats(ctx, questionID)
		if err != nil {
			t.Fatalf("GetQuestionStats: %v", err)
		}

		if got.TimesAnswered != expected.TimesAnswered {
			t.Errorf("after %d: TimesAnswered = %d, want %d", score, got.TimesAnswered, expected.TimesAnswered)
		}
		if got.TimesCorrect != expected.TimesCorrect {
			t.Errorf("after %d: TimesCorrect = %d, want %d", score, got.TimesCorrect, expected.TimesCorrect)
		}
		if got.TotalScore != expected.TotalScore {
			t.Errorf("after %d: TotalScore = %d, want %d", score, got.TotalScore, expected.TotalScore)
		}
		if got.LatestScore != expected.LatestScore {
			t.Errorf("after %d: LatestScore = %d, want %d", score, got.LatestScore, expected.LatestScore)
		}
		if got.Mastery != expected.Mastery {
			t.Errorf("after %d: persisted Mastery = %d, domain says %d", score, got.Mastery, expected.Mastery)
		}
	}
}

// TestSaveGrade_MasteryDoesNotDoubleCountLatest pins the exact value the old SQL
// got wrong: scoring 60 then 90 must yield 78, not 84.
func TestSaveGrade_MasteryDoesNotDoubleCountLatest(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	sessionID, questionID := seedGradableQuestion(t, s, ctx)

	if err := s.SaveGrade(ctx, sessionID, questionID, 60, nil, nil, "first"); err != nil {
		t.Fatalf("SaveGrade: %v", err)
	}
	if err := s.SaveGrade(ctx, sessionID, questionID, 90, nil, nil, "second"); err != nil {
		t.Fatalf("SaveGrade: %v", err)
	}

	got, err := s.GetQuestionStats(ctx, questionID)
	if err != nil {
		t.Fatalf("GetQuestionStats: %v", err)
	}

	if got.Mastery == 84 {
		t.Fatalf("mastery 84 means the latest score was averaged into history")
	}
	if got.Mastery != 78 {
		t.Errorf("Mastery = %d, want 78 (90*0.6 + 60*0.4)", got.Mastery)
	}
}

func TestSaveGrade_FirstAttemptMasteryEqualsScore(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	sessionID, questionID := seedGradableQuestion(t, s, ctx)

	if err := s.SaveGrade(ctx, sessionID, questionID, 73, nil, nil, "answer"); err != nil {
		t.Fatalf("SaveGrade: %v", err)
	}

	got, err := s.GetQuestionStats(ctx, questionID)
	if err != nil {
		t.Fatalf("GetQuestionStats: %v", err)
	}
	if got.Mastery != 73 {
		t.Errorf("first-attempt Mastery = %d, want 73", got.Mastery)
	}
	if got.TimesAnswered != 1 || got.TimesCorrect != 1 {
		t.Errorf("expected 1 answered / 1 correct, got %d / %d", got.TimesAnswered, got.TimesCorrect)
	}
}

// TestGetQuestionStats_Unanswered documents that a question with no stats row
// reads back as a zero-valued stats struct rather than an error.
func TestGetQuestionStats_Unanswered(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()
	_, questionID := seedGradableQuestion(t, s, ctx)

	got, err := s.GetQuestionStats(ctx, questionID)
	if err != nil {
		t.Fatalf("GetQuestionStats: %v", err)
	}
	if got.TimesAnswered != 0 || got.Mastery != 0 {
		t.Errorf("expected zero stats, got %+v", got)
	}
	if got.QuestionID != questionID {
		t.Errorf("QuestionID = %q, want %q", got.QuestionID, questionID)
	}
}
