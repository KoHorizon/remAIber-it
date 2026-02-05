package api

import (
	"net/http"

	"github.com/remaimber-it/backend/internal/domain/category"
)

// ── Request / Response types ────────────────────────────────────────────────

type CreateCategoryRequest struct {
	Name string `json:"name"`
}

type CategoryResponse struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Mastery int    `json:"mastery"`
}

type GetCategoryResponse struct {
	ID      string         `json:"id"`
	Name    string         `json:"name"`
	Mastery int            `json:"mastery"`
	Banks   []BankResponse `json:"banks"`
}

type UpdateCategoryRequest struct {
	Name string `json:"name"`
}

type CategoryStatsResponse struct {
	CategoryID string `json:"category_id"`
	Mastery    int    `json:"mastery"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// POST /categories
func (h *Handler) createCategory(w http.ResponseWriter, r *http.Request) {
	var req CreateCategoryRequest
	if !decodeJSON(w, r, &req) {
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

// GET /categories
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

// GET /categories/{categoryID}
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

// PUT /categories/{categoryID}
func (h *Handler) updateCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	var req UpdateCategoryRequest
	if !decodeJSON(w, r, &req) {
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

// DELETE /categories/{categoryID}
func (h *Handler) deleteCategory(w http.ResponseWriter, r *http.Request) {
	categoryID := r.PathValue("categoryID")

	if h.handleStoreError(w, h.store.DeleteCategory(categoryID), "category") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /categories/{categoryID}/banks
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

// GET /categories/{categoryID}/stats
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