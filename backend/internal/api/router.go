// internal/api/routes.go
package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/remaimber-it/backend/internal/domain/category"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	ollama "github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/store"
)

var (
	db *store.SQLiteStore
)

func init() {
	var err error
	db, err = store.NewSQLite("remaimber.db")
	if err != nil {
		log.Fatal(err)
	}
}

type GradeResult struct {
	QuestionID string
	Response   string
	Err        error
}

type GradeDetails struct {
	Score   int      `json:"score"`
	Covered []string `json:"covered"`
	Missed  []string `json:"missed"`
}

func RegisterRoutes(mux *http.ServeMux) {
	// Categories
	mux.HandleFunc("POST /categories", createCategory)
	mux.HandleFunc("GET /categories", listCategories)
	mux.HandleFunc("GET /categories/{categoryID}", getCategory)
	mux.HandleFunc("PUT /categories/{categoryID}", updateCategory)
	mux.HandleFunc("DELETE /categories/{categoryID}", deleteCategory)
	mux.HandleFunc("GET /categories/{categoryID}/banks", listBanksByCategory)

	// Banks
	mux.HandleFunc("POST /banks", createBank)
	mux.HandleFunc("GET /banks", listBanks)
	mux.HandleFunc("GET /banks/{bankID}", getBank)
	mux.HandleFunc("DELETE /banks/{bankID}", deleteBank)
	mux.HandleFunc("PATCH /banks/{bankID}/category", updateBankCategory)

	// Questions
	mux.HandleFunc("POST /banks/{bankID}/questions", addQuestion)
	mux.HandleFunc("DELETE /banks/{bankID}/questions/{questionID}", deleteQuestion)

	// Sessions
	mux.HandleFunc("POST /sessions", createSession)
	mux.HandleFunc("GET /sessions/{sessionID}", getSession)
	mux.HandleFunc("POST /sessions/{sessionID}/answers", submitAnswer)
	mux.HandleFunc("POST /sessions/{sessionID}/complete", completeSession)
}

// ============================================================================
// Categories
// ============================================================================

// POST /categories
type CreateCategoryRequest struct {
	Name string `json:"name"`
}

type CategoryResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func createCategory(w http.ResponseWriter, r *http.Request) {
	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	cat := category.New(req.Name)
	if err := db.SaveCategory(cat); err != nil {
		http.Error(w, "failed to save category", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CategoryResponse{
		ID:   cat.ID,
		Name: cat.Name,
	})
}

// GET /categories
func listCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := db.ListCategories()
	if err != nil {
		http.Error(w, "failed to load categories", http.StatusInternalServerError)
		return
	}

	response := make([]CategoryResponse, len(categories))
	for i, cat := range categories {
		response[i] = CategoryResponse{
			ID:   cat.ID,
			Name: cat.Name,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /categories/{categoryID}
type GetCategoryResponse struct {
	ID    string         `json:"id"`
	Name  string         `json:"name"`
	Banks []BankResponse `json:"banks"`
}

type BankResponse struct {
	ID         string  `json:"id"`
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
}

func getCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	cat, err := db.GetCategory(categoryID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "category not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to load category", http.StatusInternalServerError)
		return
	}

	banks, err := db.ListBanksByCategory(categoryID)
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
		return
	}

	bankResponses := make([]BankResponse, len(banks))
	for i, bank := range banks {
		bankResponses[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetCategoryResponse{
		ID:    cat.ID,
		Name:  cat.Name,
		Banks: bankResponses,
	})
}

// PUT /categories/{categoryID}
type UpdateCategoryRequest struct {
	Name string `json:"name"`
}

func updateCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	var req UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	cat := &category.Category{
		ID:   categoryID,
		Name: req.Name,
	}

	err := db.UpdateCategory(cat)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "category not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to update category", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CategoryResponse{
		ID:   cat.ID,
		Name: cat.Name,
	})
}

// DELETE /categories/{categoryID}
func deleteCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	err := db.DeleteCategory(categoryID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "category not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to delete category", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /categories/{categoryID}/banks
func listBanksByCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	// Check category exists
	_, err := db.GetCategory(categoryID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "category not found", http.StatusNotFound)
		return
	}

	banks, err := db.ListBanksByCategory(categoryID)
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
		return
	}

	response := make([]BankResponse, len(banks))
	for i, bank := range banks {
		response[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ============================================================================
// Banks
// ============================================================================

// POST /banks
type CreateBankRequest struct {
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
}

type CreateBankResponse struct {
	ID         string  `json:"id"`
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
}

// Fix for createBank in router.go - replace the existing createBank function with this:

func createBank(w http.ResponseWriter, r *http.Request) {
	var req CreateBankRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Subject == "" {
		http.Error(w, "subject is required", http.StatusBadRequest)
		return
	}

	// Category is now required
	if req.CategoryID == nil || *req.CategoryID == "" {
		http.Error(w, "category_id is required", http.StatusBadRequest)
		return
	}

	// Validate category exists
	_, err := db.GetCategory(*req.CategoryID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "category not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to validate category", http.StatusInternalServerError)
		return
	}

	bank := questionbank.NewWithCategory(req.Subject, *req.CategoryID)

	if err := db.SaveBank(bank); err != nil {
		http.Error(w, "failed to save bank", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(CreateBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
	})
}

// GET /banks
func listBanks(w http.ResponseWriter, r *http.Request) {
	banks, err := db.ListBanks()
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
		return
	}

	response := make([]CreateBankResponse, len(banks))
	for i, bank := range banks {
		response[i] = CreateBankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /banks/{bankID}
type GetBankResponse struct {
	ID         string             `json:"id"`
	Subject    string             `json:"subject"`
	CategoryID *string            `json:"category_id,omitempty"`
	Questions  []QuestionResponse `json:"questions"`
}

type QuestionResponse struct {
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

func getBank(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	bank, err := db.GetBank(bankID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "bank not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to load bank", http.StatusInternalServerError)
		return
	}

	questions := make([]QuestionResponse, len(bank.Questions))
	for i, q := range bank.Questions {
		questions[i] = QuestionResponse{
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
		Questions:  questions,
	})
}

// DELETE /banks/{bankID}
func deleteBank(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	err := db.DeleteBank(bankID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "bank not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to delete bank", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PATCH /banks/{bankID}/category
type UpdateBankCategoryRequest struct {
	CategoryID *string `json:"category_id"`
}

func updateBankCategory(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	var req UpdateBankCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Validate category exists if provided
	if req.CategoryID != nil {
		_, err := db.GetCategory(*req.CategoryID)
		if errors.Is(err, store.ErrNotFound) {
			http.Error(w, "category not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "failed to validate category", http.StatusInternalServerError)
			return
		}
	}

	err := db.UpdateBankCategory(bankID, req.CategoryID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "bank not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to update bank", http.StatusInternalServerError)
		return
	}

	// Return updated bank
	bank, _ := db.GetBank(bankID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
	})
}

// ============================================================================
// Questions
// ============================================================================

// POST /banks/{bankID}/questions
type AddQuestionRequest struct {
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

type AddQuestionResponse struct {
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

func addQuestion(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	bank, err := db.GetBank(bankID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "bank not found", http.StatusNotFound)
		return
	}

	var req AddQuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if err := bank.AddQuestions(req.Subject, req.ExpectedAnswer); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newQuestion := bank.Questions[len(bank.Questions)-1]
	if err := db.AddQuestion(bankID, newQuestion); err != nil {
		http.Error(w, "failed to save question", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(AddQuestionResponse{
		ID:             newQuestion.ID,
		Subject:        newQuestion.Subject,
		ExpectedAnswer: newQuestion.ExpectedAnswer,
	})
}

// DELETE /banks/{bankID}/questions/{questionID}
func deleteQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := r.PathValue("questionID")

	err := db.DeleteQuestion(questionID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "question not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to delete question", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ============================================================================
// Sessions
// ============================================================================

// POST /sessions
type CreateSessionRequest struct {
	BankID         string `json:"bank_id"`
	MaxQuestions   *int   `json:"max_questions,omitempty"`    // optional: limit number of questions
	MaxDurationMin *int   `json:"max_duration_min,omitempty"` // optional: time limit in minutes
}

type SessionQuestion struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
}

type CreateSessionResponse struct {
	ID             string            `json:"id"`
	Questions      []SessionQuestion `json:"questions"`
	MaxDurationMin *int              `json:"max_duration_min,omitempty"` // echo back for frontend
}

func createSession(w http.ResponseWriter, r *http.Request) {
	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	bank, err := db.GetBank(req.BankID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "bank not found", http.StatusNotFound)
		return
	}

	if len(bank.Questions) == 0 {
		http.Error(w, "bank has no questions", http.StatusBadRequest)
		return
	}

	// Build session config from request
	config := practicesession.DefaultConfig()

	if req.MaxQuestions != nil && *req.MaxQuestions > 0 {
		config.MaxQuestions = req.MaxQuestions
	}

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		duration := time.Duration(*req.MaxDurationMin) * time.Minute
		config.MaxDuration = &duration
	}

	session := practicesession.NewWithConfig(bank, config)
	if err := db.SaveSession(session); err != nil {
		http.Error(w, "failed to save session", http.StatusInternalServerError)
		return
	}

	questions := make([]SessionQuestion, len(session.Questions))
	for i, q := range session.Questions {
		questions[i] = SessionQuestion{
			ID:      q.ID,
			Subject: q.Subject,
		}
	}

	response := CreateSessionResponse{
		ID:        session.ID,
		Questions: questions,
	}

	// Echo back duration if set (for frontend timer)
	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		response.MaxDurationMin = req.MaxDurationMin
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GET /sessions/{sessionID}
func getSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := db.GetSession(sessionID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	questions := make([]SessionQuestion, len(session.Questions))
	for i, q := range session.Questions {
		questions[i] = SessionQuestion{
			ID:      q.ID,
			Subject: q.Subject,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateSessionResponse{
		ID:        session.ID,
		Questions: questions,
	})
}

// POST /sessions/{sessionID}/answers
type SubmitAnswerRequest struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
}

type SubmitAnswerResponse struct {
	Status string `json:"status"`
}

func submitAnswer(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := db.GetSession(sessionID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	var req SubmitAnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Find the question
	var question *questionbank.Question
	for _, q := range session.Questions {
		if q.ID == req.QuestionID {
			question = &q
			break
		}
	}

	if question == nil {
		http.Error(w, "question not found in session", http.StatusNotFound)
		return
	}

	// Grade asynchronously
	db.AddToWaitGroup(sessionID)
	go func(q questionbank.Question, answer string) {
		defer db.DoneWaitGroup(sessionID)

		response, err := ollama.GradeAnswer(q.Subject, q.ExpectedAnswer, answer)
		if err != nil {
			log.Printf("grading error: %v", err)
			return
		}

		var result struct {
			Score   int      `json:"score"`
			Covered []string `json:"covered"`
			Missed  []string `json:"missed"`
		}
		if err := json.Unmarshal([]byte(response), &result); err != nil {
			log.Printf("parse error: %v", err)
			return
		}

		db.SaveGrade(sessionID, q.ID, result.Score, result.Covered, result.Missed)
	}(*question, req.Answer)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SubmitAnswerResponse{
		Status: "submitted",
	})
}

// POST /sessions/{sessionID}/complete
type CompleteSessionResponse struct {
	SessionID  string         `json:"session_id"`
	TotalScore int            `json:"total_score"`
	MaxScore   int            `json:"max_score"`
	Results    []GradeDetails `json:"results"`
}

func completeSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	// Get the session to know all questions
	session, err := db.GetSession(sessionID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	// Wait for all grading to complete
	wg := db.GetWaitGroup(sessionID)
	if wg != nil {
		wg.Wait()
	}

	grades, err := db.GetGrades(sessionID)
	if err != nil {
		http.Error(w, "failed to load grades", http.StatusInternalServerError)
		return
	}

	// Create a map of graded questions for quick lookup
	gradedQuestions := make(map[string]store.StoredGrade)
	for _, g := range grades {
		gradedQuestions[g.QuestionID] = g
	}

	// Build results for ALL questions in the session (in order)
	results := make([]GradeDetails, len(session.Questions))
	totalScore := 0

	for i, q := range session.Questions {
		if grade, answered := gradedQuestions[q.ID]; answered {
			// Question was answered
			results[i] = GradeDetails{
				Score:   grade.Score,
				Covered: grade.Covered,
				Missed:  grade.Missed,
			}
			totalScore += grade.Score
		} else {
			// Question was NOT answered - score is 0
			results[i] = GradeDetails{
				Score:   0,
				Covered: []string{},
				Missed:  []string{"Not answered"},
			}
		}
	}

	// Max score is based on total questions in session, not just answered ones
	maxScore := len(session.Questions) * 100

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CompleteSessionResponse{
		SessionID:  sessionID,
		TotalScore: totalScore,
		MaxScore:   maxScore,
		Results:    results,
	})
}
