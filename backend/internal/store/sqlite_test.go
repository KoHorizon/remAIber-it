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

func TestUpdateBankGradingPrompt(t *testing.T) {
	s := newTestStore(t)
	ctx := context.Background()

	bank := questionbank.New("Test")
	s.SaveBank(ctx, bank)

	prompt := "Be strict about terminology"
	if err := s.UpdateBankGradingPrompt(ctx, bank.ID, &prompt); err != nil {
		t.Fatalf("UpdateBankGradingPrompt: %v", err)
	}

	got, _ := s.GetBank(ctx, bank.ID)
	if got.GradingPrompt == nil || *got.GradingPrompt != prompt {
		t.Errorf("expected grading prompt %q, got %v", prompt, got.GradingPrompt)
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
