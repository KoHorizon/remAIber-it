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
	Score      int      `json:"score"`
	Covered    []string `json:"covered"`
	Missed     []string `json:"missed"`
	UserAnswer string   `json:"user_answer"`
}

func RegisterRoutes(mux *http.ServeMux) {
	// Categories
	mux.HandleFunc("POST /categories", createCategory)
	mux.HandleFunc("GET /categories", listCategories)
	mux.HandleFunc("GET /categories/{categoryID}", getCategory)
	mux.HandleFunc("PUT /categories/{categoryID}", updateCategory)
	mux.HandleFunc("DELETE /categories/{categoryID}", deleteCategory)
	mux.HandleFunc("GET /categories/{categoryID}/banks", listBanksByCategory)
	mux.HandleFunc("GET /categories/{categoryID}/stats", getCategoryStats)

	// Banks
	mux.HandleFunc("POST /banks", createBank)
	mux.HandleFunc("GET /banks", listBanks)
	mux.HandleFunc("GET /banks/{bankID}", getBank)
	mux.HandleFunc("DELETE /banks/{bankID}", deleteBank)
	mux.HandleFunc("PATCH /banks/{bankID}/category", updateBankCategory)
	mux.HandleFunc("PUT /banks/{bankID}/grading-prompt", updateBankGradingPrompt)
	mux.HandleFunc("GET /banks/{bankID}/stats", getBankStats)

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
	ID      string `json:"id"`
	Name    string `json:"name"`
	Mastery int    `json:"mastery"`
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
		ID:      cat.ID,
		Name:    cat.Name,
		Mastery: 0,
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
		mastery, _ := db.GetCategoryMastery(cat.ID)
		response[i] = CategoryResponse{
			ID:      cat.ID,
			Name:    cat.Name,
			Mastery: mastery,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /categories/{categoryID}
type GetCategoryResponse struct {
	ID      string         `json:"id"`
	Name    string         `json:"name"`
	Mastery int            `json:"mastery"`
	Banks   []BankResponse `json:"banks"`
}

type BankResponse struct {
	ID            string  `json:"id"`
	Subject       string  `json:"subject"`
	CategoryID    *string `json:"category_id,omitempty"`
	GradingPrompt *string `json:"grading_prompt,omitempty"`
	BankType      string  `json:"bank_type"`
	Language      *string `json:"language,omitempty"`
	Mastery       int     `json:"mastery"`
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
		mastery, _ := db.GetBankMastery(bank.ID)
		bankResponses[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	categoryMastery, _ := db.GetCategoryMastery(categoryID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetCategoryResponse{
		ID:      cat.ID,
		Name:    cat.Name,
		Mastery: categoryMastery,
		Banks:   bankResponses,
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

	mastery, _ := db.GetCategoryMastery(categoryID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CategoryResponse{
		ID:      cat.ID,
		Name:    cat.Name,
		Mastery: mastery,
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
		mastery, _ := db.GetBankMastery(bank.ID)
		response[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /categories/{categoryID}/stats
type CategoryStatsResponse struct {
	CategoryID string `json:"category_id"`
	Mastery    int    `json:"mastery"`
}

func getCategoryStats(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	_, err := db.GetCategory(categoryID)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "category not found", http.StatusNotFound)
		return
	}

	mastery, err := db.GetCategoryMastery(categoryID)
	if err != nil {
		http.Error(w, "failed to get stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CategoryStatsResponse{
		CategoryID: categoryID,
		Mastery:    mastery,
	})
}

// ============================================================================
// Banks
// ============================================================================

// POST /banks
type CreateBankRequest struct {
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
	BankType   string  `json:"bank_type,omitempty"` // theory, code, cli
	Language   *string `json:"language,omitempty"`  // for code banks
}

type CreateBankResponse struct {
	ID         string  `json:"id"`
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
	BankType   string  `json:"bank_type"`
	Language   *string `json:"language,omitempty"`
	Mastery    int     `json:"mastery"`
}

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

	// Validate bank_type
	bankType := questionbank.BankType(req.BankType)
	if bankType == "" {
		bankType = questionbank.BankTypeTheory
	}
	if bankType != questionbank.BankTypeTheory && bankType != questionbank.BankTypeCode && bankType != questionbank.BankTypeCLI {
		http.Error(w, "invalid bank_type: must be theory, code, or cli", http.StatusBadRequest)
		return
	}

	bank := questionbank.NewWithOptions(req.Subject, req.CategoryID, bankType, req.Language)

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
		BankType:   string(bank.BankType),
		Language:   bank.Language,
		Mastery:    0,
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
		mastery, _ := db.GetBankMastery(bank.ID)
		response[i] = CreateBankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /banks/{bankID}
type GetBankResponse struct {
	ID            string             `json:"id"`
	Subject       string             `json:"subject"`
	CategoryID    *string            `json:"category_id,omitempty"`
	GradingPrompt *string            `json:"grading_prompt,omitempty"`
	BankType      string             `json:"bank_type"`
	Language      *string            `json:"language,omitempty"`
	Mastery       int                `json:"mastery"`
	Questions     []QuestionResponse `json:"questions"`
}

type QuestionResponse struct {
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
	Mastery        int    `json:"mastery"`
	TimesAnswered  int    `json:"times_answered"`
	TimesCorrect   int    `json:"times_correct"`
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

	// Get stats for all questions in this bank
	statsMap := make(map[string]*questionbank.QuestionStats)
	stats, err := db.GetQuestionStatsByBank(bankID)
	if err == nil {
		for i := range stats {
			statsMap[stats[i].QuestionID] = &stats[i]
		}
	}

	questions := make([]QuestionResponse, len(bank.Questions))
	for i, q := range bank.Questions {
		qStats := statsMap[q.ID]
		var mastery, timesAnswered, timesCorrect int
		if qStats != nil {
			mastery = qStats.Mastery
			timesAnswered = qStats.TimesAnswered
			timesCorrect = qStats.TimesCorrect
		}
		questions[i] = QuestionResponse{
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
			Mastery:        mastery,
			TimesAnswered:  timesAnswered,
			TimesCorrect:   timesCorrect,
		}
	}

	bankMastery, _ := db.GetBankMastery(bankID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetBankResponse{
		ID:            bank.ID,
		Subject:       bank.Subject,
		CategoryID:    bank.CategoryID,
		GradingPrompt: bank.GradingPrompt,
		BankType:      string(bank.BankType),
		Language:      bank.Language,
		Mastery:       bankMastery,
		Questions:     questions,
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
	mastery, _ := db.GetBankMastery(bankID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
		Mastery:    mastery,
	})
}

// PUT /banks/{bankID}/grading-prompt
type UpdateGradingPromptRequest struct {
	GradingPrompt *string `json:"grading_prompt"`
}

func updateBankGradingPrompt(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	var req UpdateGradingPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Allow empty string to clear the prompt (set to nil)
	var promptToSave *string
	if req.GradingPrompt != nil && *req.GradingPrompt != "" {
		promptToSave = req.GradingPrompt
	}

	err := db.UpdateBankGradingPrompt(bankID, promptToSave)
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, "bank not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to update grading prompt", http.StatusInternalServerError)
		return
	}

	// Return updated bank
	bank, _ := db.GetBank(bankID)
	mastery, _ := db.GetBankMastery(bankID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetBankResponse{
		ID:            bank.ID,
		Subject:       bank.Subject,
		CategoryID:    bank.CategoryID,
		GradingPrompt: bank.GradingPrompt,
		Mastery:       mastery,
		Questions:     nil,
	})
}

// GET /banks/{bankID}/stats
type BankStatsResponse struct {
	BankID         string                  `json:"bank_id"`
	Mastery        int                     `json:"mastery"`
	TotalQuestions int                     `json:"total_questions"`
	QuestionStats  []QuestionStatsResponse `json:"question_stats"`
}

type QuestionStatsResponse struct {
	QuestionID    string `json:"question_id"`
	TimesAnswered int    `json:"times_answered"`
	TimesCorrect  int    `json:"times_correct"`
	Mastery       int    `json:"mastery"`
}

func getBankStats(w http.ResponseWriter, r *http.Request) {
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

	stats, err := db.GetQuestionStatsByBank(bankID)
	if err != nil {
		http.Error(w, "failed to get stats", http.StatusInternalServerError)
		return
	}

	questionStats := make([]QuestionStatsResponse, len(stats))
	for i, s := range stats {
		questionStats[i] = QuestionStatsResponse{
			QuestionID:    s.QuestionID,
			TimesAnswered: s.TimesAnswered,
			TimesCorrect:  s.TimesCorrect,
			Mastery:       s.Mastery,
		}
	}

	mastery, _ := db.GetBankMastery(bankID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(BankStatsResponse{
		BankID:         bankID,
		Mastery:        mastery,
		TotalQuestions: len(bank.Questions),
		QuestionStats:  questionStats,
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
	Mastery        int    `json:"mastery"`
	TimesAnswered  int    `json:"times_answered"`
	TimesCorrect   int    `json:"times_correct"`
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
		Mastery:        0,
		TimesAnswered:  0,
		TimesCorrect:   0,
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
	FocusOnWeak    bool   `json:"focus_on_weak"`              // prioritize low mastery questions
}

type SessionQuestion struct {
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

type CreateSessionResponse struct {
	ID             string            `json:"id"`
	Questions      []SessionQuestion `json:"questions"`
	MaxDurationMin *int              `json:"max_duration_min,omitempty"`
	FocusOnWeak    bool              `json:"focus_on_weak"`
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

	config.FocusOnWeak = req.FocusOnWeak

	// Get ordered questions if focus on weak is enabled
	var orderedQuestions []questionbank.Question
	if req.FocusOnWeak {
		orderedQuestions, err = db.GetQuestionsOrderedByMastery(req.BankID, true) // ascending = lowest mastery first
		if err != nil {
			http.Error(w, "failed to get question order", http.StatusInternalServerError)
			return
		}
	}

	session := practicesession.NewWithConfig(bank, config, orderedQuestions)
	if err := db.SaveSession(session); err != nil {
		http.Error(w, "failed to save session", http.StatusInternalServerError)
		return
	}

	questions := make([]SessionQuestion, len(session.Questions))
	for i, q := range session.Questions {
		questions[i] = SessionQuestion{
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
		}
	}

	response := CreateSessionResponse{
		ID:          session.ID,
		Questions:   questions,
		FocusOnWeak: session.FocusOnWeak,
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
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
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

	// Get the bank to retrieve custom grading prompt
	bank, _ := db.GetBank(session.QuestionBankId)
	var gradingPrompt *string
	if bank != nil {
		gradingPrompt = bank.GradingPrompt
	}

	// Grade asynchronously
	db.AddToWaitGroup(sessionID)
	go func(q questionbank.Question, answer string, customPrompt *string) {
		defer db.DoneWaitGroup(sessionID)

		response, err := ollama.GradeAnswer(q.Subject, q.ExpectedAnswer, answer, customPrompt)
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

		db.SaveGrade(sessionID, q.ID, result.Score, result.Covered, result.Missed, answer)
	}(*question, req.Answer, gradingPrompt)

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
				Score:      grade.Score,
				Covered:    grade.Covered,
				Missed:     grade.Missed,
				UserAnswer: grade.UserAnswer,
			}
			totalScore += grade.Score
		} else {
			// Question was NOT answered - score is 0
			results[i] = GradeDetails{
				Score:      0,
				Covered:    []string{},
				Missed:     []string{"Not answered"},
				UserAnswer: "",
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
