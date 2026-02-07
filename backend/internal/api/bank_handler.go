package api

import (
	"errors"
	"net/http"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

// ── Request / Response types ────────────────────────────────────────────────

type CreateBankRequest struct {
	Subject    string  `json:"subject" example:"Go concurrency patterns"`
	CategoryID *string `json:"category_id,omitempty" example:"a1b2c3d4e5f6g7h8"`
	BankType   string  `json:"bank_type,omitempty" example:"theory"`
	Language   *string `json:"language,omitempty" example:"go"`
}

func (r *CreateBankRequest) Validate() error {
	if r.Subject == "" {
		return errors.New("subject is required")
	}
	if r.CategoryID == nil || *r.CategoryID == "" {
		return errors.New("category_id is required")
	}
	bt := questionbank.BankType(r.BankType)
	if r.BankType != "" && bt != questionbank.BankTypeTheory && bt != questionbank.BankTypeCode && bt != questionbank.BankTypeCLI {
		return errors.New("invalid bank_type: must be theory, code, or cli")
	}
	return nil
}

type CreateBankResponse struct {
	ID         string  `json:"id" example:"x9y8z7w6v5u4t3s2"`
	Subject    string  `json:"subject" example:"Go concurrency patterns"`
	CategoryID *string `json:"category_id,omitempty" example:"a1b2c3d4e5f6g7h8"`
	BankType   string  `json:"bank_type" example:"theory"`
	Language   *string `json:"language,omitempty" example:"go"`
	Mastery    int     `json:"mastery" example:"0"`
}

// BankResponse is used when banks appear nested inside a category response.
type BankResponse struct {
	ID            string  `json:"id" example:"x9y8z7w6v5u4t3s2"`
	Subject       string  `json:"subject" example:"Go concurrency patterns"`
	CategoryID    *string `json:"category_id,omitempty" example:"a1b2c3d4e5f6g7h8"`
	GradingPrompt *string `json:"grading_prompt,omitempty"`
	BankType      string  `json:"bank_type" example:"theory"`
	Language      *string `json:"language,omitempty" example:"go"`
	Mastery       int     `json:"mastery" example:"42"`
}

type GetBankResponse struct {
	ID            string             `json:"id" example:"x9y8z7w6v5u4t3s2"`
	Subject       string             `json:"subject" example:"Go concurrency patterns"`
	CategoryID    *string            `json:"category_id,omitempty" example:"a1b2c3d4e5f6g7h8"`
	GradingPrompt *string            `json:"grading_prompt,omitempty"`
	BankType      string             `json:"bank_type" example:"theory"`
	Language      *string            `json:"language,omitempty" example:"go"`
	Mastery       int                `json:"mastery" example:"42"`
	Questions     []QuestionResponse `json:"questions"`
}

type QuestionResponse struct {
	ID             string `json:"id" example:"q1w2e3r4t5y6u7i8"`
	Subject        string `json:"subject" example:"What is a goroutine?"`
	ExpectedAnswer string `json:"expected_answer" example:"A goroutine is a lightweight thread managed by the Go runtime."`
	Mastery        int    `json:"mastery" example:"75"`
	TimesAnswered  int    `json:"times_answered" example:"3"`
	TimesCorrect   int    `json:"times_correct" example:"2"`
}

type UpdateBankCategoryRequest struct {
	CategoryID *string `json:"category_id" example:"a1b2c3d4e5f6g7h8"`
}

type UpdateGradingPromptRequest struct {
	GradingPrompt *string `json:"grading_prompt" example:"Be strict about exact terminology."`
}

type BankStatsResponse struct {
	BankID         string                  `json:"bank_id" example:"x9y8z7w6v5u4t3s2"`
	Mastery        int                     `json:"mastery" example:"42"`
	TotalQuestions int                     `json:"total_questions" example:"10"`
	QuestionStats  []QuestionStatsResponse `json:"question_stats"`
}

type QuestionStatsResponse struct {
	QuestionID    string `json:"question_id" example:"q1w2e3r4t5y6u7i8"`
	TimesAnswered int    `json:"times_answered" example:"3"`
	TimesCorrect  int    `json:"times_correct" example:"2"`
	Mastery       int    `json:"mastery" example:"75"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// createBank creates a new question bank.
// @Summary      Create a question bank
// @Description  Create a new question bank within a category.
// @Tags         Banks
// @Accept       json
// @Produce      json
// @Param        body  body      CreateBankRequest  true  "Bank to create"
// @Success      201   {object}  CreateBankResponse
// @Failure      400   {object}  map[string]string
// @Failure      404   {object}  map[string]string  "category not found"
// @Failure      500   {object}  map[string]string
// @Router       /banks [post]
func (h *Handler) createBank(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateBankRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	_, err := h.store.GetCategory(ctx, *req.CategoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	bankType := questionbank.BankType(req.BankType)
	if bankType == "" {
		bankType = questionbank.BankTypeTheory
	}

	bank := questionbank.NewWithOptions(req.Subject, req.CategoryID, bankType, req.Language)

	if err := h.store.SaveBank(ctx, bank); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save bank")
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

// listBanks lists all question banks.
// @Summary      List all banks
// @Description  Returns all question banks across all categories.
// @Tags         Banks
// @Produce      json
// @Success      200  {array}   CreateBankResponse
// @Failure      500  {object}  map[string]string
// @Router       /banks [get]
func (h *Handler) listBanks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	banks, err := h.store.ListBanks(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load banks")
		return
	}

	response := make([]CreateBankResponse, len(banks))
	for i, bank := range banks {
		mastery, _ := h.store.GetBankMastery(ctx, bank.ID)
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

// getBank returns a single bank with its questions.
// @Summary      Get a question bank
// @Description  Returns a question bank with all its questions and their stats.
// @Tags         Banks
// @Produce      json
// @Param        bankID  path      string  true  "Bank ID"
// @Success      200     {object}  GetBankResponse
// @Failure      404     {object}  map[string]string
// @Failure      500     {object}  map[string]string
// @Router       /banks/{bankID} [get]
func (h *Handler) getBank(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(ctx, bankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	statsMap := make(map[string]*questionbank.QuestionStats)
	stats, err := h.store.GetQuestionStatsByBank(ctx, bankID)
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

	bankMastery, _ := h.store.GetBankMastery(ctx, bankID)

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

// deleteBank removes a question bank and its questions.
// @Summary      Delete a question bank
// @Description  Delete a bank and cascade-delete all its questions and stats.
// @Tags         Banks
// @Param        bankID  path  string  true  "Bank ID"
// @Success      204
// @Failure      404  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /banks/{bankID} [delete]
func (h *Handler) deleteBank(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	if h.handleStoreError(w, h.store.DeleteBank(ctx, bankID), "bank") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// updateBankCategory moves a bank to a different category.
// @Summary      Update bank category
// @Description  Move a question bank to a different category (or set to null).
// @Tags         Banks
// @Accept       json
// @Produce      json
// @Param        bankID  path      string                     true  "Bank ID"
// @Param        body    body      UpdateBankCategoryRequest   true  "New category"
// @Success      200     {object}  CreateBankResponse
// @Failure      400     {object}  map[string]string
// @Failure      404     {object}  map[string]string
// @Router       /banks/{bankID}/category [patch]
func (h *Handler) updateBankCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	var req UpdateBankCategoryRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	if req.CategoryID != nil {
		_, err := h.store.GetCategory(ctx, *req.CategoryID)
		if h.handleStoreError(w, err, "category") {
			return
		}
	}

	if h.handleStoreError(w, h.store.UpdateBankCategory(ctx, bankID, req.CategoryID), "bank") {
		return
	}

	bank, _ := h.store.GetBank(ctx, bankID)
	mastery, _ := h.store.GetBankMastery(ctx, bankID)

	respondJSON(w, http.StatusOK, CreateBankResponse{
		ID:         bank.ID,
		Subject:    bank.Subject,
		CategoryID: bank.CategoryID,
		BankType:   string(bank.BankType),
		Language:   bank.Language,
		Mastery:    mastery,
	})
}

// updateBankGradingPrompt sets or clears a custom grading prompt.
// @Summary      Update grading prompt
// @Description  Set or clear a custom grading prompt for a question bank.
// @Tags         Banks
// @Accept       json
// @Produce      json
// @Param        bankID  path      string                      true  "Bank ID"
// @Param        body    body      UpdateGradingPromptRequest   true  "Grading prompt"
// @Success      200     {object}  GetBankResponse
// @Failure      400     {object}  map[string]string
// @Failure      404     {object}  map[string]string
// @Router       /banks/{bankID}/grading-prompt [put]
func (h *Handler) updateBankGradingPrompt(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	var req UpdateGradingPromptRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	var promptToSave *string
	if req.GradingPrompt != nil && *req.GradingPrompt != "" {
		promptToSave = req.GradingPrompt
	}

	if h.handleStoreError(w, h.store.UpdateBankGradingPrompt(ctx, bankID, promptToSave), "bank") {
		return
	}

	bank, _ := h.store.GetBank(ctx, bankID)
	mastery, _ := h.store.GetBankMastery(ctx, bankID)

	respondJSON(w, http.StatusOK, GetBankResponse{
		ID:            bank.ID,
		Subject:       bank.Subject,
		CategoryID:    bank.CategoryID,
		GradingPrompt: bank.GradingPrompt,
		BankType:      string(bank.BankType),
		Language:      bank.Language,
		Mastery:       mastery,
		Questions:     nil,
	})
}

// getBankStats returns mastery statistics for a bank.
// @Summary      Get bank stats
// @Description  Returns mastery and per-question statistics for a bank.
// @Tags         Banks
// @Produce      json
// @Param        bankID  path      string  true  "Bank ID"
// @Success      200     {object}  BankStatsResponse
// @Failure      404     {object}  map[string]string
// @Failure      500     {object}  map[string]string
// @Router       /banks/{bankID}/stats [get]
func (h *Handler) getBankStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(ctx, bankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	stats, err := h.store.GetQuestionStatsByBank(ctx, bankID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get stats")
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

	mastery, _ := h.store.GetBankMastery(ctx, bankID)

	respondJSON(w, http.StatusOK, BankStatsResponse{
		BankID:         bankID,
		Mastery:        mastery,
		TotalQuestions: len(bank.Questions),
		QuestionStats:  questionStats,
	})
}
