// internal/api/router.go
package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/remaimber-it/backend/internal/domain/category"
	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	grader "github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/store"
)

// RegisterRoutes wires all HTTP routes to the handler methods.
func RegisterRoutes(mux *http.ServeMux, h *Handler) {
	// Categories
	mux.HandleFunc("POST /categories", h.createCategory)
	mux.HandleFunc("GET /categories", h.listCategories)
	mux.HandleFunc("GET /categories/{categoryID}", h.getCategory)
	mux.HandleFunc("PUT /categories/{categoryID}", h.updateCategory)
	mux.HandleFunc("DELETE /categories/{categoryID}", h.deleteCategory)
	mux.HandleFunc("GET /categories/{categoryID}/banks", h.listBanksByCategory)
	mux.HandleFunc("GET /categories/{categoryID}/stats", h.getCategoryStats)

	// Banks
	mux.HandleFunc("POST /banks", h.createBank)
	mux.HandleFunc("GET /banks", h.listBanks)
	mux.HandleFunc("GET /banks/{bankID}", h.getBank)
	mux.HandleFunc("DELETE /banks/{bankID}", h.deleteBank)
	mux.HandleFunc("PATCH /banks/{bankID}/category", h.updateBankCategory)
	mux.HandleFunc("PUT /banks/{bankID}/grading-prompt", h.updateBankGradingPrompt)
	mux.HandleFunc("GET /banks/{bankID}/stats", h.getBankStats)

	// Questions
	mux.HandleFunc("POST /banks/{bankID}/questions", h.addQuestion)
	mux.HandleFunc("DELETE /banks/{bankID}/questions/{questionID}", h.deleteQuestion)

	// Sessions
	mux.HandleFunc("POST /sessions", h.createSession)
	mux.HandleFunc("GET /sessions/{sessionID}", h.getSession)
	mux.HandleFunc("POST /sessions/{sessionID}/answers", h.submitAnswer)
	mux.HandleFunc("POST /sessions/{sessionID}/complete", h.completeSession)

	// Export/Import
	mux.HandleFunc("GET /export", h.exportAll)
	mux.HandleFunc("POST /import", h.importAll)
}

// ============================================================================
// Request/Response types
// ============================================================================

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
	Status     string   `json:"status"` // "success", "failed", or "not_answered"
}

// ============================================================================
// Categories
// ============================================================================

type CreateCategoryRequest struct {
	Name string `json:"name"`
}

type CategoryResponse struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Mastery int    `json:"mastery"`
}

func (h *Handler) createCategory(w http.ResponseWriter, r *http.Request) {
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
	if err := h.store.SaveCategory(cat); err != nil {
		http.Error(w, "failed to save category", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, CategoryResponse{
		ID:      cat.ID,
		Name:    cat.Name,
		Mastery: 0,
	})
}

func (h *Handler) listCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.store.ListCategories()
	if err != nil {
		http.Error(w, "failed to load categories", http.StatusInternalServerError)
		return
	}

	response := make([]CategoryResponse, len(categories))
	for i, cat := range categories {
		mastery, _ := h.store.GetCategoryMastery(cat.ID)
		response[i] = CategoryResponse{
			ID:      cat.ID,
			Name:    cat.Name,
			Mastery: mastery,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

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

func (h *Handler) getCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	cat, err := h.store.GetCategory(categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	banks, err := h.store.ListBanksByCategory(categoryID)
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
		return
	}

	bankResponses := make([]BankResponse, len(banks))
	for i, bank := range banks {
		mastery, _ := h.store.GetBankMastery(bank.ID)
		bankResponses[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	categoryMastery, _ := h.store.GetCategoryMastery(categoryID)

	respondJSON(w, http.StatusOK, GetCategoryResponse{
		ID:      cat.ID,
		Name:    cat.Name,
		Mastery: categoryMastery,
		Banks:   bankResponses,
	})
}

type UpdateCategoryRequest struct {
	Name string `json:"name"`
}

func (h *Handler) updateCategory(w http.ResponseWriter, r *http.Request) {
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

	if h.handleStoreError(w, h.store.UpdateCategory(cat), "category") {
		return
	}

	mastery, _ := h.store.GetCategoryMastery(categoryID)

	respondJSON(w, http.StatusOK, CategoryResponse{
		ID:      cat.ID,
		Name:    cat.Name,
		Mastery: mastery,
	})
}

func (h *Handler) deleteCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	if h.handleStoreError(w, h.store.DeleteCategory(categoryID), "category") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listBanksByCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	_, err := h.store.GetCategory(categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	banks, err := h.store.ListBanksByCategory(categoryID)
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
		return
	}

	response := make([]BankResponse, len(banks))
	for i, bank := range banks {
		mastery, _ := h.store.GetBankMastery(bank.ID)
		response[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

type CategoryStatsResponse struct {
	CategoryID string `json:"category_id"`
	Mastery    int    `json:"mastery"`
}

func (h *Handler) getCategoryStats(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	_, err := h.store.GetCategory(categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	mastery, err := h.store.GetCategoryMastery(categoryID)
	if err != nil {
		http.Error(w, "failed to get stats", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, CategoryStatsResponse{
		CategoryID: categoryID,
		Mastery:    mastery,
	})
}

// ============================================================================
// Banks
// ============================================================================

type CreateBankRequest struct {
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
	BankType   string  `json:"bank_type,omitempty"`
	Language   *string `json:"language,omitempty"`
}

type CreateBankResponse struct {
	ID         string  `json:"id"`
	Subject    string  `json:"subject"`
	CategoryID *string `json:"category_id,omitempty"`
	BankType   string  `json:"bank_type"`
	Language   *string `json:"language,omitempty"`
	Mastery    int     `json:"mastery"`
}

func (h *Handler) createBank(w http.ResponseWriter, r *http.Request) {
	var req CreateBankRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Subject == "" {
		http.Error(w, "subject is required", http.StatusBadRequest)
		return
	}

	if req.CategoryID == nil || *req.CategoryID == "" {
		http.Error(w, "category_id is required", http.StatusBadRequest)
		return
	}

	_, err := h.store.GetCategory(*req.CategoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	bankType := questionbank.BankType(req.BankType)
	if bankType == "" {
		bankType = questionbank.BankTypeTheory
	}
	if bankType != questionbank.BankTypeTheory && bankType != questionbank.BankTypeCode && bankType != questionbank.BankTypeCLI {
		http.Error(w, "invalid bank_type: must be theory, code, or cli", http.StatusBadRequest)
		return
	}

	bank := questionbank.NewWithOptions(req.Subject, req.CategoryID, bankType, req.Language)

	if err := h.store.SaveBank(bank); err != nil {
		http.Error(w, "failed to save bank", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, CreateBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
		BankType:   string(bank.BankType),
		Language:   bank.Language,
		Mastery:    0,
	})
}

func (h *Handler) listBanks(w http.ResponseWriter, r *http.Request) {
	banks, err := h.store.ListBanks()
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
		return
	}

	response := make([]CreateBankResponse, len(banks))
	for i, bank := range banks {
		mastery, _ := h.store.GetBankMastery(bank.ID)
		response[i] = CreateBankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

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

func (h *Handler) getBank(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(bankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	statsMap := make(map[string]*questionbank.QuestionStats)
	stats, err := h.store.GetQuestionStatsByBank(bankID)
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

	bankMastery, _ := h.store.GetBankMastery(bankID)

	respondJSON(w, http.StatusOK, GetBankResponse{
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

func (h *Handler) deleteBank(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	if h.handleStoreError(w, h.store.DeleteBank(bankID), "bank") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type UpdateBankCategoryRequest struct {
	CategoryID *string `json:"category_id"`
}

func (h *Handler) updateBankCategory(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	var req UpdateBankCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.CategoryID != nil {
		_, err := h.store.GetCategory(*req.CategoryID)
		if h.handleStoreError(w, err, "category") {
			return
		}
	}

	if h.handleStoreError(w, h.store.UpdateBankCategory(bankID, req.CategoryID), "bank") {
		return
	}

	bank, _ := h.store.GetBank(bankID)
	mastery, _ := h.store.GetBankMastery(bankID)

	respondJSON(w, http.StatusOK, CreateBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
		Mastery:    mastery,
	})
}

type UpdateGradingPromptRequest struct {
	GradingPrompt *string `json:"grading_prompt"`
}

func (h *Handler) updateBankGradingPrompt(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	var req UpdateGradingPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	var promptToSave *string
	if req.GradingPrompt != nil && *req.GradingPrompt != "" {
		promptToSave = req.GradingPrompt
	}

	if h.handleStoreError(w, h.store.UpdateBankGradingPrompt(bankID, promptToSave), "bank") {
		return
	}

	bank, _ := h.store.GetBank(bankID)
	mastery, _ := h.store.GetBankMastery(bankID)

	respondJSON(w, http.StatusOK, GetBankResponse{
		ID:            bank.ID,
		Subject:       bank.Subject,
		CategoryID:    bank.CategoryID,
		GradingPrompt: bank.GradingPrompt,
		Mastery:       mastery,
		Questions:     nil,
	})
}

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

func (h *Handler) getBankStats(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(bankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	stats, err := h.store.GetQuestionStatsByBank(bankID)
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

	mastery, _ := h.store.GetBankMastery(bankID)

	respondJSON(w, http.StatusOK, BankStatsResponse{
		BankID:         bankID,
		Mastery:        mastery,
		TotalQuestions: len(bank.Questions),
		QuestionStats:  questionStats,
	})
}

// ============================================================================
// Questions
// ============================================================================

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

func (h *Handler) addQuestion(w http.ResponseWriter, r *http.Request) {
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(bankID)
	if h.handleStoreError(w, err, "bank") {
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
	if err := h.store.AddQuestion(bankID, newQuestion); err != nil {
		http.Error(w, "failed to save question", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, AddQuestionResponse{
		ID:             newQuestion.ID,
		Subject:        newQuestion.Subject,
		ExpectedAnswer: newQuestion.ExpectedAnswer,
		Mastery:        0,
		TimesAnswered:  0,
		TimesCorrect:   0,
	})
}

func (h *Handler) deleteQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := r.PathValue("questionID")

	if h.handleStoreError(w, h.store.DeleteQuestion(questionID), "question") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ============================================================================
// Sessions
// ============================================================================

type CreateSessionRequest struct {
	BankID         string   `json:"bank_id"`
	MaxQuestions   *int     `json:"max_questions,omitempty"`
	MaxDurationMin *int     `json:"max_duration_min,omitempty"`
	FocusOnWeak    bool     `json:"focus_on_weak"`
	QuestionIDs    []string `json:"question_ids,omitempty"`
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

func (h *Handler) createSession(w http.ResponseWriter, r *http.Request) {
	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	bank, err := h.store.GetBank(req.BankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	if len(bank.Questions) == 0 {
		http.Error(w, "bank has no questions", http.StatusBadRequest)
		return
	}

	config := practicesession.DefaultConfig()

	if req.MaxQuestions != nil && *req.MaxQuestions > 0 {
		config.MaxQuestions = req.MaxQuestions
	}

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		duration := time.Duration(*req.MaxDurationMin) * time.Minute
		config.MaxDuration = &duration
	}

	config.FocusOnWeak = req.FocusOnWeak

	var session *practicesession.PracticeSession

	if len(req.QuestionIDs) > 0 {
		questionMap := make(map[string]questionbank.Question)
		for _, q := range bank.Questions {
			questionMap[q.ID] = q
		}

		var specificQuestions []questionbank.Question
		for _, qid := range req.QuestionIDs {
			if q, ok := questionMap[qid]; ok {
				specificQuestions = append(specificQuestions, q)
			}
		}

		if len(specificQuestions) == 0 {
			http.Error(w, "no valid questions found", http.StatusBadRequest)
			return
		}

		session = practicesession.NewWithSpecificQuestions(bank, specificQuestions, config)
	} else {
		var orderedQuestions []questionbank.Question
		if req.FocusOnWeak {
			orderedQuestions, err = h.store.GetQuestionsOrderedByMastery(req.BankID, true)
			if err != nil {
				http.Error(w, "failed to get question order", http.StatusInternalServerError)
				return
			}
		}

		session = practicesession.NewWithConfig(bank, config, orderedQuestions)
	}

	if err := h.store.SaveSession(session); err != nil {
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

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		response.MaxDurationMin = req.MaxDurationMin
	}

	respondJSON(w, http.StatusCreated, response)
}

func (h *Handler) getSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(sessionID)
	if h.handleStoreError(w, err, "session") {
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

	respondJSON(w, http.StatusOK, CreateSessionResponse{
		ID:        session.ID,
		Questions: questions,
	})
}

type SubmitAnswerRequest struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
}

type SubmitAnswerResponse struct {
	Status string `json:"status"`
}

func (h *Handler) submitAnswer(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	var req SubmitAnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

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

	bank, _ := h.store.GetBank(session.QuestionBankId)
	var gradingPrompt *string
	var bankType string = "theory"
	if bank != nil {
		gradingPrompt = bank.GradingPrompt
		bankType = string(bank.BankType)
	}

	h.store.AddToWaitGroup(sessionID)
	go func(q questionbank.Question, answer string, customPrompt *string, bType string) {
		defer h.store.DoneWaitGroup(sessionID)

		response, err := grader.GradeAnswer(q.Subject, q.ExpectedAnswer, answer, customPrompt, bType)
		if err != nil {
			log.Printf("grading error for question %s: %v", q.ID, err)
			if saveErr := h.store.SaveGradeFailure(sessionID, q.ID, answer, err.Error()); saveErr != nil {
				log.Printf("failed to save grade failure: %v", saveErr)
			}
			return
		}

		var result struct {
			Score   int      `json:"score"`
			Covered []string `json:"covered"`
			Missed  []string `json:"missed"`
		}
		if err := json.Unmarshal([]byte(response), &result); err != nil {
			log.Printf("parse error for question %s: %v (response: %s)", q.ID, err, response)
			if saveErr := h.store.SaveGradeFailure(sessionID, q.ID, answer, "failed to parse grading response"); saveErr != nil {
				log.Printf("failed to save grade failure: %v", saveErr)
			}
			return
		}

		if err := h.store.SaveGrade(sessionID, q.ID, result.Score, result.Covered, result.Missed, answer); err != nil {
			log.Printf("failed to save grade for question %s: %v", q.ID, err)
		}
	}(*question, req.Answer, gradingPrompt, bankType)

	respondJSON(w, http.StatusOK, SubmitAnswerResponse{
		Status: "submitted",
	})
}

type CompleteSessionResponse struct {
	SessionID  string         `json:"session_id"`
	TotalScore int            `json:"total_score"`
	MaxScore   int            `json:"max_score"`
	Results    []GradeDetails `json:"results"`
}

func (h *Handler) completeSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	wg := h.store.GetWaitGroup(sessionID)
	if wg != nil {
		wg.Wait()
	}

	grades, err := h.store.GetGrades(sessionID)
	if err != nil {
		http.Error(w, "failed to load grades", http.StatusInternalServerError)
		return
	}

	gradedQuestions := make(map[string]store.StoredGrade)
	for _, g := range grades {
		gradedQuestions[g.QuestionID] = g
	}

	results := make([]GradeDetails, len(session.Questions))
	totalScore := 0

	for i, q := range session.Questions {
		if grade, answered := gradedQuestions[q.ID]; answered {
			status := "success"
			if grade.Status == store.GradeStatusFailed {
				status = "failed"
			}
			results[i] = GradeDetails{
				Score:      grade.Score,
				Covered:    grade.Covered,
				Missed:     grade.Missed,
				UserAnswer: grade.UserAnswer,
				Status:     status,
			}
			totalScore += grade.Score
		} else {
			results[i] = GradeDetails{
				Score:      0,
				Covered:    []string{},
				Missed:     []string{"Not answered"},
				UserAnswer: "",
				Status:     "not_answered",
			}
		}
	}

	maxScore := len(session.Questions) * 100

	respondJSON(w, http.StatusOK, CompleteSessionResponse{
		SessionID:  sessionID,
		TotalScore: totalScore,
		MaxScore:   maxScore,
		Results:    results,
	})
}

// ============================================================================
// Export/Import
// ============================================================================

type ExportQuestion struct {
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

type ExportBank struct {
	Subject       string           `json:"subject"`
	GradingPrompt *string          `json:"grading_prompt,omitempty"`
	BankType      string           `json:"bank_type"`
	Language      *string          `json:"language,omitempty"`
	Questions     []ExportQuestion `json:"questions"`
}

type ExportCategory struct {
	Name  string       `json:"name"`
	Banks []ExportBank `json:"banks"`
}

type ExportData struct {
	Version    string           `json:"version"`
	ExportedAt string           `json:"exported_at"`
	Categories []ExportCategory `json:"categories"`
}

func (h *Handler) exportAll(w http.ResponseWriter, r *http.Request) {
	categories, err := h.store.ListCategories()
	if err != nil {
		http.Error(w, "failed to load categories", http.StatusInternalServerError)
		return
	}

	exportData := ExportData{
		Version:    "1.0",
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Categories: make([]ExportCategory, 0),
	}

	for _, cat := range categories {
		banks, err := h.store.ListBanksByCategory(cat.ID)
		if err != nil {
			continue
		}

		exportCat := ExportCategory{
			Name:  cat.Name,
			Banks: make([]ExportBank, 0),
		}

		for _, bank := range banks {
			fullBank, err := h.store.GetBank(bank.ID)
			if err != nil {
				continue
			}

			exportBank := ExportBank{
				Subject:       fullBank.Subject,
				GradingPrompt: fullBank.GradingPrompt,
				BankType:      string(fullBank.BankType),
				Language:      fullBank.Language,
				Questions:     make([]ExportQuestion, len(fullBank.Questions)),
			}

			for i, q := range fullBank.Questions {
				exportBank.Questions[i] = ExportQuestion{
					Subject:        q.Subject,
					ExpectedAnswer: q.ExpectedAnswer,
				}
			}

			exportCat.Banks = append(exportCat.Banks, exportBank)
		}

		exportData.Categories = append(exportData.Categories, exportCat)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=remaimber-export.json")
	json.NewEncoder(w).Encode(exportData)
}

type ImportResult struct {
	CategoriesCreated int `json:"categories_created"`
	BanksCreated      int `json:"banks_created"`
	QuestionsCreated  int `json:"questions_created"`
}

func (h *Handler) importAll(w http.ResponseWriter, r *http.Request) {
	var importData ExportData
	if err := json.NewDecoder(r.Body).Decode(&importData); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	result := ImportResult{}

	for _, cat := range importData.Categories {
		newCat := category.New(cat.Name)
		if err := h.store.SaveCategory(newCat); err != nil {
			h.logger.Error("failed to create category", "name", cat.Name, "error", err)
			continue
		}
		result.CategoriesCreated++

		for _, bank := range cat.Banks {
			bankType := questionbank.BankType(bank.BankType)
			if bankType == "" {
				bankType = questionbank.BankTypeTheory
			}

			newBank := questionbank.NewWithOptions(bank.Subject, &newCat.ID, bankType, bank.Language)
			if bank.GradingPrompt != nil {
				newBank.SetGradingPrompt(bank.GradingPrompt)
			}

			if err := h.store.SaveBank(newBank); err != nil {
				h.logger.Error("failed to create bank", "subject", bank.Subject, "error", err)
				continue
			}
			result.BanksCreated++

			for _, q := range bank.Questions {
				if err := newBank.AddQuestions(q.Subject, q.ExpectedAnswer); err != nil {
					h.logger.Error("failed to add question", "error", err)
					continue
				}
				newQuestion := newBank.Questions[len(newBank.Questions)-1]
				if err := h.store.AddQuestion(newBank.ID, newQuestion); err != nil {
					h.logger.Error("failed to save question", "error", err)
					continue
				}
				result.QuestionsCreated++
			}
		}
	}

	respondJSON(w, http.StatusCreated, result)
}
