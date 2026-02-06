package api

import (
	"net/http"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

// ── Request / Response types ────────────────────────────────────────────────

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

// BankResponse is used when banks appear nested inside a category response.
type BankResponse struct {
	ID            string  `json:"id"`
	Subject       string  `json:"subject"`
	CategoryID    *string `json:"category_id,omitempty"`
	GradingPrompt *string `json:"grading_prompt,omitempty"`
	BankType      string  `json:"bank_type"`
	Language      *string `json:"language,omitempty"`
	Mastery       int     `json:"mastery"`
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

type UpdateBankCategoryRequest struct {
	CategoryID *string `json:"category_id"`
}

type UpdateGradingPromptRequest struct {
	GradingPrompt *string `json:"grading_prompt"`
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

// ── Handlers ────────────────────────────────────────────────────────────────

// POST /banks
func (h *Handler) createBank(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateBankRequest
	if !decodeJSON(w, r, &req) {
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

	_, err := h.store.GetCategory(ctx, *req.CategoryID)
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

	if err := h.store.SaveBank(ctx, bank); err != nil {
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

// GET /banks
func (h *Handler) listBanks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	banks, err := h.store.ListBanks(ctx)
	if err != nil {
		http.Error(w, "failed to load banks", http.StatusInternalServerError)
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

// GET /banks/{bankID}
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

// DELETE /banks/{bankID}
func (h *Handler) deleteBank(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	if h.handleStoreError(w, h.store.DeleteBank(ctx, bankID), "bank") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// PATCH /banks/{bankID}/category
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
		Mastery:    mastery,
	})
}

// PUT /banks/{bankID}/grading-prompt
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
		Mastery:       mastery,
		Questions:     nil,
	})
}

// GET /banks/{bankID}/stats
func (h *Handler) getBankStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(ctx, bankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	stats, err := h.store.GetQuestionStatsByBank(ctx, bankID)
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

	mastery, _ := h.store.GetBankMastery(ctx, bankID)

	respondJSON(w, http.StatusOK, BankStatsResponse{
		BankID:         bankID,
		Mastery:        mastery,
		TotalQuestions: len(bank.Questions),
		QuestionStats:  questionStats,
	})
}
