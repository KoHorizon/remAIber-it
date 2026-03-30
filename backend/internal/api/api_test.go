package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/remaimber-it/backend/internal/api"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/service"
	"github.com/remaimber-it/backend/internal/store"
)

// ── stub grader ──────────────────────────────────────────────────────────────

type stubGrader struct{}

func (stubGrader) GradeAnswer(_ context.Context, _, _, _ string, _ *string, _ string) (string, error) {
	return `{"score":80,"covered":["concept A"],"missed":["concept B"]}`, nil
}

var _ grader.Grader = stubGrader{}

// ── test server setup ────────────────────────────────────────────────────────

type testServer struct {
	mux   *http.ServeMux
	store *store.SQLiteStore
}

func newTestServer(t *testing.T) *testServer {
	t.Helper()
	s, err := store.NewSQLite(":memory:")
	if err != nil {
		t.Fatalf("store.NewSQLite: %v", err)
	}
	t.Cleanup(func() { s.Close() })

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	gs := service.NewGradingService(s, stubGrader{}, nil, logger)
	h := api.NewHandler(s, gs, logger)

	mux := http.NewServeMux()
	api.RegisterRoutes(mux, h)

	return &testServer{mux: mux, store: s}
}

func (ts *testServer) do(method, path string, body any) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	if body != nil {
		json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rr := httptest.NewRecorder()
	ts.mux.ServeHTTP(rr, req)
	return rr
}

func decode[T any](t *testing.T, rr *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.NewDecoder(rr.Body).Decode(&v); err != nil {
		t.Fatalf("decode response: %v (body: %s)", err, rr.Body.String())
	}
	return v
}

// ── Folders ──────────────────────────────────────────────────────────────────

func TestCreateFolder(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/folders", map[string]string{"name": "Work"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body)
	}

	var resp map[string]any
	resp = decode[map[string]any](t, rr)
	if resp["name"] != "Work" {
		t.Errorf("expected name Work, got %v", resp["name"])
	}
}

func TestCreateFolder_MissingName(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/folders", map[string]string{"name": ""})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestListFolders(t *testing.T) {
	ts := newTestServer(t)

	ts.do("POST", "/folders", map[string]string{"name": "A"})
	ts.do("POST", "/folders", map[string]string{"name": "B"})

	rr := ts.do("GET", "/folders", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp []map[string]any
	resp = decode[[]map[string]any](t, rr)
	if len(resp) != 2 {
		t.Errorf("expected 2 folders, got %d", len(resp))
	}
}

func TestGetFolder_NotFound(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("GET", "/folders/nonexistent", nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestDeleteFolder(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/folders", map[string]string{"name": "Temp"})
	resp := decode[map[string]any](t, rr)
	folderID := resp["id"].(string)

	rr = ts.do("DELETE", "/folders/"+folderID, nil)
	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}

	rr = ts.do("GET", "/folders/"+folderID, nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404 after delete, got %d", rr.Code)
	}
}

// ── Categories ───────────────────────────────────────────────────────────────

func TestCreateCategory(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/categories", map[string]string{"name": "Golang"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["name"] != "Golang" {
		t.Errorf("expected name Golang, got %v", resp["name"])
	}
}

func TestCreateCategory_MissingName(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("POST", "/categories", map[string]string{})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestListCategories(t *testing.T) {
	ts := newTestServer(t)

	ts.do("POST", "/categories", map[string]string{"name": "Go"})
	ts.do("POST", "/categories", map[string]string{"name": "Rust"})

	rr := ts.do("GET", "/categories", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	resp := decode[[]map[string]any](t, rr)
	if len(resp) != 2 {
		t.Errorf("expected 2 categories, got %d", len(resp))
	}
}

func TestGetCategory_NotFound(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("GET", "/categories/nonexistent", nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestUpdateCategory(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/categories", map[string]string{"name": "Old"})
	resp := decode[map[string]any](t, rr)
	catID := resp["id"].(string)

	rr = ts.do("PUT", "/categories/"+catID, map[string]string{"name": "New"})
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	resp = decode[map[string]any](t, rr)
	if resp["name"] != "New" {
		t.Errorf("expected name New, got %v", resp["name"])
	}
}

func TestDeleteCategory(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/categories", map[string]string{"name": "Temp"})
	resp := decode[map[string]any](t, rr)
	catID := resp["id"].(string)

	rr = ts.do("DELETE", "/categories/"+catID, nil)
	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}

	rr = ts.do("GET", "/categories/"+catID, nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404 after delete, got %d", rr.Code)
	}
}

func TestUpdateCategoryFolder(t *testing.T) {
	ts := newTestServer(t)

	folderRR := ts.do("POST", "/folders", map[string]string{"name": "Work"})
	folderResp := decode[map[string]any](t, folderRR)
	folderID := folderResp["id"].(string)

	catRR := ts.do("POST", "/categories", map[string]string{"name": "Go"})
	catResp := decode[map[string]any](t, catRR)
	catID := catResp["id"].(string)

	rr := ts.do("PATCH", "/categories/"+catID+"/folder", map[string]string{"folder_id": folderID})
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["folder_id"] != folderID {
		t.Errorf("expected folder_id %q, got %v", folderID, resp["folder_id"])
	}
}

// ── Banks ─────────────────────────────────────────────────────────────────────

func createCategory(t *testing.T, ts *testServer) string {
	t.Helper()
	rr := ts.do("POST", "/categories", map[string]string{"name": "Go"})
	resp := decode[map[string]any](t, rr)
	return resp["id"].(string)
}

func TestCreateBank(t *testing.T) {
	ts := newTestServer(t)
	catID := createCategory(t, ts)

	rr := ts.do("POST", "/banks", map[string]any{
		"subject":     "Concurrency",
		"category_id": catID,
		"bank_type":   "theory",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["subject"] != "Concurrency" {
		t.Errorf("expected subject Concurrency, got %v", resp["subject"])
	}
}

func TestGetBank_NotFound(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("GET", "/banks/nonexistent", nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestDeleteBank(t *testing.T) {
	ts := newTestServer(t)
	catID := createCategory(t, ts)

	rr := ts.do("POST", "/banks", map[string]any{"subject": "Temp", "category_id": catID, "bank_type": "theory"})
	resp := decode[map[string]any](t, rr)
	bankID := resp["id"].(string)

	rr = ts.do("DELETE", "/banks/"+bankID, nil)
	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}

	rr = ts.do("GET", "/banks/"+bankID, nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404 after delete, got %d", rr.Code)
	}
}

// ── Questions ─────────────────────────────────────────────────────────────────

func createBankWithQuestion(t *testing.T, ts *testServer) (bankID, questionID string) {
	t.Helper()
	catID := createCategory(t, ts)

	rr := ts.do("POST", "/banks", map[string]any{"subject": "Test", "category_id": catID, "bank_type": "theory"})
	bankResp := decode[map[string]any](t, rr)
	bankID = bankResp["id"].(string)

	rr = ts.do("POST", fmt.Sprintf("/banks/%s/questions", bankID), map[string]string{
		"subject":         "What is a goroutine?",
		"expected_answer": "A lightweight thread",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("addQuestion: expected 201, got %d: %s", rr.Code, rr.Body)
	}
	qResp := decode[map[string]any](t, rr)
	questionID = qResp["id"].(string)
	return
}

func TestAddQuestion(t *testing.T) {
	ts := newTestServer(t)
	bankID, questionID := createBankWithQuestion(t, ts)

	if bankID == "" || questionID == "" {
		t.Fatal("expected non-empty bankID and questionID")
	}
}

func TestDeleteQuestion(t *testing.T) {
	ts := newTestServer(t)
	bankID, questionID := createBankWithQuestion(t, ts)

	rr := ts.do("DELETE", fmt.Sprintf("/banks/%s/questions/%s", bankID, questionID), nil)
	if rr.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", rr.Code)
	}
}

// ── Sessions ──────────────────────────────────────────────────────────────────

func createSession(t *testing.T, ts *testServer) (sessionID, questionID string) {
	t.Helper()
	bankID, qID := createBankWithQuestion(t, ts)
	questionID = qID

	rr := ts.do("POST", "/sessions", map[string]any{"bank_id": bankID})
	if rr.Code != http.StatusCreated {
		t.Fatalf("createSession: expected 201, got %d: %s", rr.Code, rr.Body)
	}
	resp := decode[map[string]any](t, rr)
	sessionID = resp["id"].(string)
	return
}

func TestCreateSession(t *testing.T) {
	ts := newTestServer(t)
	sessionID, _ := createSession(t, ts)
	if sessionID == "" {
		t.Fatal("expected non-empty session ID")
	}
}

func TestCreateSession_BankNotFound(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("POST", "/sessions", map[string]any{"bank_id": "nonexistent"})
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestCreateSession_EmptyBank(t *testing.T) {
	ts := newTestServer(t)
	catID := createCategory(t, ts)

	rr := ts.do("POST", "/banks", map[string]any{"subject": "Empty", "category_id": catID, "bank_type": "theory"})
	resp := decode[map[string]any](t, rr)
	bankID := resp["id"].(string)

	rr = ts.do("POST", "/sessions", map[string]any{"bank_id": bankID})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty bank, got %d", rr.Code)
	}
}

func TestGetSession(t *testing.T) {
	ts := newTestServer(t)
	sessionID, _ := createSession(t, ts)

	rr := ts.do("GET", "/sessions/"+sessionID, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["id"] != sessionID {
		t.Errorf("expected session ID %q, got %v", sessionID, resp["id"])
	}
	if resp["status"] != "active" {
		t.Errorf("expected status active, got %v", resp["status"])
	}
}

func TestGetSession_NotFound(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("GET", "/sessions/nonexistent", nil)
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestSubmitAnswer(t *testing.T) {
	ts := newTestServer(t)
	sessionID, questionID := createSession(t, ts)

	rr := ts.do("POST", "/sessions/"+sessionID+"/answers", map[string]string{
		"question_id": questionID,
		"answer":      "A goroutine is a lightweight thread",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["status"] != "submitted" {
		t.Errorf("expected status submitted, got %v", resp["status"])
	}
}

func TestSubmitAnswer_SessionNotFound(t *testing.T) {
	ts := newTestServer(t)
	rr := ts.do("POST", "/sessions/ghost/answers", map[string]string{
		"question_id": "q1",
		"answer":      "something",
	})
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestSubmitAnswer_QuestionNotInSession(t *testing.T) {
	ts := newTestServer(t)
	sessionID, _ := createSession(t, ts)

	rr := ts.do("POST", "/sessions/"+sessionID+"/answers", map[string]string{
		"question_id": "notaquestion",
		"answer":      "something",
	})
	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}

func TestCompleteSession(t *testing.T) {
	ts := newTestServer(t)
	sessionID, _ := createSession(t, ts)

	rr := ts.do("POST", "/sessions/"+sessionID+"/complete", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["session_id"] != sessionID {
		t.Errorf("expected session_id %q, got %v", sessionID, resp["session_id"])
	}
}

func TestCompleteSession_AlreadyCompleted(t *testing.T) {
	ts := newTestServer(t)
	sessionID, _ := createSession(t, ts)

	ts.do("POST", "/sessions/"+sessionID+"/complete", nil)

	rr := ts.do("POST", "/sessions/"+sessionID+"/complete", nil)
	if rr.Code != http.StatusConflict {
		t.Errorf("expected 409 on double complete, got %d", rr.Code)
	}
}

func TestSubmitAnswer_AfterComplete(t *testing.T) {
	ts := newTestServer(t)
	sessionID, questionID := createSession(t, ts)

	ts.do("POST", "/sessions/"+sessionID+"/complete", nil)

	rr := ts.do("POST", "/sessions/"+sessionID+"/answers", map[string]string{
		"question_id": questionID,
		"answer":      "late answer",
	})
	if rr.Code != http.StatusConflict {
		t.Errorf("expected 409 submitting to completed session, got %d", rr.Code)
	}
}

// ── Export / Import ───────────────────────────────────────────────────────────

func TestExportAll(t *testing.T) {
	ts := newTestServer(t)

	// Seed some data
	catID := createCategory(t, ts)
	rr := ts.do("POST", "/banks", map[string]any{"subject": "Concurrency", "category_id": catID, "bank_type": "theory"})
	bankResp := decode[map[string]any](t, rr)
	bankID := bankResp["id"].(string)
	ts.do("POST", fmt.Sprintf("/banks/%s/questions", bankID), map[string]string{
		"subject":         "What is a goroutine?",
		"expected_answer": "A lightweight thread",
	})

	rr = ts.do("GET", "/export", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	var export map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&export); err != nil {
		t.Fatalf("decode export: %v", err)
	}
	if export["version"] != "1.1" {
		t.Errorf("expected version 1.1, got %v", export["version"])
	}
}

func TestImportAll(t *testing.T) {
	ts := newTestServer(t)

	payload := map[string]any{
		"version":     "1.1",
		"exported_at": "2025-01-01T00:00:00Z",
		"folders":     []any{},
		"categories": []any{
			map[string]any{
				"name": "Imported",
				"banks": []any{
					map[string]any{
						"subject":   "Go Basics",
						"bank_type": "theory",
						"questions": []any{
							map[string]string{
								"subject":         "What is Go?",
								"expected_answer": "A compiled language",
							},
						},
					},
				},
			},
		},
	}

	rr := ts.do("POST", "/import", payload)
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if resp["categories_created"] != float64(1) {
		t.Errorf("expected 1 category created, got %v", resp["categories_created"])
	}
	if resp["banks_created"] != float64(1) {
		t.Errorf("expected 1 bank created, got %v", resp["banks_created"])
	}
	if resp["questions_created"] != float64(1) {
		t.Errorf("expected 1 question created, got %v", resp["questions_created"])
	}
}

func TestImportAll_InvalidBankType_DefaultsToTheory(t *testing.T) {
	ts := newTestServer(t)

	payload := map[string]any{
		"version":     "1.1",
		"exported_at": "2025-01-01T00:00:00Z",
		"folders":     []any{},
		"categories": []any{
			map[string]any{
				"name": "Test",
				"banks": []any{
					map[string]any{
						"subject":   "Bank",
						"bank_type": "invalid_type",
						"questions": []any{},
					},
				},
			},
		},
	}

	rr := ts.do("POST", "/import", payload)
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body)
	}

	// Verify the bank was stored with theory type
	ctx := context.Background()
	cats, _ := ts.store.ListCategories(ctx)
	if len(cats) == 0 {
		t.Fatal("expected at least one category after import")
	}
	banks, _ := ts.store.ListBanksByCategory(ctx, cats[len(cats)-1].ID)
	if len(banks) == 0 {
		t.Fatal("expected at least one bank after import")
	}
	if banks[0].BankType != questionbank.BankTypeTheory {
		t.Errorf("expected BankTypeTheory for invalid bank_type, got %v", banks[0].BankType)
	}
}

// ── Request validation ────────────────────────────────────────────────────────

func TestDecodeJSON_InvalidBody(t *testing.T) {
	ts := newTestServer(t)

	req := httptest.NewRequest("POST", "/categories", bytes.NewBufferString("not json"))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	ts.mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid JSON, got %d", rr.Code)
	}
}

func TestDecodeJSON_BodyTooLarge(t *testing.T) {
	ts := newTestServer(t)

	// Build a valid JSON object whose encoded size exceeds 1 MB so that
	// MaxBytesReader triggers during json.Decode (not a JSON parse error).
	// {"name":"xxx...xxx"} where the string value is ~1.1 MB.
	name := bytes.Repeat([]byte("x"), (1<<20)+100)
	var buf bytes.Buffer
	buf.WriteString(`{"name":"`)
	buf.Write(name)
	buf.WriteString(`"}`)

	req := httptest.NewRequest("POST", "/categories", &buf)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	ts.mux.ServeHTTP(rr, req)

	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413 for oversized body, got %d", rr.Code)
	}
}

// ── Mastery stats ─────────────────────────────────────────────────────────────

func TestGetCategoryStats(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/categories", map[string]string{"name": "Go"})
	resp := decode[map[string]any](t, rr)
	catID := resp["id"].(string)

	rr = ts.do("GET", "/categories/"+catID+"/stats", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	stats := decode[map[string]any](t, rr)
	if stats["category_id"] != catID {
		t.Errorf("expected category_id %q, got %v", catID, stats["category_id"])
	}
}

func TestGetFolderStats(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/folders", map[string]string{"name": "Work"})
	resp := decode[map[string]any](t, rr)
	folderID := resp["id"].(string)

	rr = ts.do("GET", "/folders/"+folderID+"/stats", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	stats := decode[map[string]any](t, rr)
	if stats["folder_id"] != folderID {
		t.Errorf("expected folder_id %q, got %v", folderID, stats["folder_id"])
	}
}

// ── Simulate grading ──────────────────────────────────────────────────────────

func TestSimulateGrade(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/simulate/grade", map[string]string{
		"question":        "What is a goroutine?",
		"expected_answer": "A lightweight thread managed by the Go runtime",
		"user_answer":     "A goroutine is a concurrent unit of execution",
		"bank_type":       "theory",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}

	resp := decode[map[string]any](t, rr)
	if _, ok := resp["score"]; !ok {
		t.Error("expected score in response")
	}
	// Verify arrays are non-null (even if empty)
	if resp["covered"] == nil {
		t.Error("expected covered to be array, got nil")
	}
	if resp["missed"] == nil {
		t.Error("expected missed to be array, got nil")
	}
}

func TestSimulateGrade_MissingQuestion(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/simulate/grade", map[string]string{
		"expected_answer": "answer",
		"user_answer":     "test",
	})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestSimulateGrade_MissingExpectedAnswer(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/simulate/grade", map[string]string{
		"question":    "What is Go?",
		"user_answer": "test",
	})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestSimulateGrade_MissingUserAnswer(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/simulate/grade", map[string]string{
		"question":        "What is Go?",
		"expected_answer": "A programming language",
	})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

func TestSimulateGrade_InvalidBankType(t *testing.T) {
	ts := newTestServer(t)

	rr := ts.do("POST", "/simulate/grade", map[string]string{
		"question":        "What is Go?",
		"expected_answer": "A programming language",
		"user_answer":     "Go is a language",
		"bank_type":       "invalid_type",
	})
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid bank_type, got %d", rr.Code)
	}
}

func TestSimulateGrade_DefaultBankType(t *testing.T) {
	ts := newTestServer(t)

	// Empty bank_type should default to "theory"
	rr := ts.do("POST", "/simulate/grade", map[string]string{
		"question":        "What is Go?",
		"expected_answer": "A programming language",
		"user_answer":     "Go is a language",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body)
	}
}

// ── CORS middleware ───────────────────────────────────────────────────────────

func TestCORSMiddleware_Preflight(t *testing.T) {
	ts := newTestServer(t)

	// Wrap with CORS middleware like the real server does
	handler := api.CORS(ts.mux)

	req := httptest.NewRequest("OPTIONS", "/categories", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 for OPTIONS preflight, got %d", rr.Code)
	}
	if rr.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Error("expected CORS allow-origin header")
	}
}

