package api

import (
	"errors"
	"net/http"

	"github.com/remaimber-it/backend/internal/domain/category"
)

// ── Request / Response types ────────────────────────────────────────────────

type CreateCategoryRequest struct {
	Name     string  `json:"name" example:"Golang"`
	FolderID *string `json:"folder_id,omitempty" example:"f1o2l3d4e5r6i7d8"`
}

func (r *CreateCategoryRequest) Validate() error {
	if r.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

type CategoryResponse struct {
	ID       string  `json:"id" example:"a1b2c3d4e5f6g7h8"`
	Name     string  `json:"name" example:"Golang"`
	FolderID *string `json:"folder_id,omitempty" example:"f1o2l3d4e5r6i7d8"`
	Mastery  int     `json:"mastery" example:"42"`
}

type GetCategoryResponse struct {
	ID       string         `json:"id" example:"a1b2c3d4e5f6g7h8"`
	Name     string         `json:"name" example:"Golang"`
	FolderID *string        `json:"folder_id,omitempty" example:"f1o2l3d4e5r6i7d8"`
	Mastery  int            `json:"mastery" example:"42"`
	Banks    []BankResponse `json:"banks"`
}

type UpdateCategoryRequest struct {
	Name string `json:"name" example:"Rust"`
}

func (r *UpdateCategoryRequest) Validate() error {
	if r.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

type UpdateCategoryFolderRequest struct {
	FolderID *string `json:"folder_id" example:"f1o2l3d4e5r6i7d8"`
}

type CategoryStatsResponse struct {
	CategoryID string `json:"category_id" example:"a1b2c3d4e5f6g7h8"`
	Mastery    int    `json:"mastery" example:"42"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// createCategory creates a new category.
// @Summary      Create a category
// @Description  Create a new category for organizing question banks. Optionally assign to a folder.
// @Tags         Categories
// @Accept       json
// @Produce      json
// @Param        body  body      CreateCategoryRequest  true  "Category to create"
// @Success      201   {object}  CategoryResponse
// @Failure      400   {object}  map[string]string
// @Failure      404   {object}  map[string]string  "folder not found"
// @Failure      500   {object}  map[string]string
// @Router       /categories [post]
func (h *Handler) createCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateCategoryRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	// Validate folder exists if provided
	if req.FolderID != nil && *req.FolderID != "" {
		_, err := h.store.GetFolder(ctx, *req.FolderID)
		if h.handleStoreError(w, err, "folder") {
			return
		}
	}

	cat := category.New(req.Name)
	if req.FolderID != nil && *req.FolderID != "" {
		cat.FolderID = req.FolderID
	}

	if err := h.store.SaveCategory(ctx, cat); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save category")
		return
	}

	respondJSON(w, http.StatusCreated, CategoryResponse{
		ID:       cat.ID,
		Name:     cat.Name,
		FolderID: cat.FolderID,
		Mastery:  0,
	})
}

// listCategories lists all categories.
// @Summary      List categories
// @Description  Returns all categories with their mastery scores.
// @Tags         Categories
// @Produce      json
// @Success      200  {array}   CategoryResponse
// @Failure      500  {object}  map[string]string
// @Router       /categories [get]
func (h *Handler) listCategories(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categories, err := h.store.ListCategories(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}

	response := make([]CategoryResponse, len(categories))
	for i, cat := range categories {
		mastery, _ := h.store.GetCategoryMastery(ctx, cat.ID)
		response[i] = CategoryResponse{
			ID:       cat.ID,
			Name:     cat.Name,
			FolderID: cat.FolderID,
			Mastery:  mastery,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

// getCategory returns a single category with its banks.
// @Summary      Get a category
// @Description  Returns a category with all its question banks.
// @Tags         Categories
// @Produce      json
// @Param        categoryID  path      string  true  "Category ID"
// @Success      200         {object}  GetCategoryResponse
// @Failure      404         {object}  map[string]string
// @Failure      500         {object}  map[string]string
// @Router       /categories/{categoryID} [get]
func (h *Handler) getCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categoryID := r.PathValue("categoryID")

	cat, err := h.store.GetCategory(ctx, categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	banks, err := h.store.ListBanksByCategory(ctx, categoryID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load banks")
		return
	}

	bankResponses := make([]BankResponse, len(banks))
	for i, bank := range banks {
		mastery, _ := h.store.GetBankMastery(ctx, bank.ID)
		bankResponses[i] = BankResponse{
			ID:         bank.ID,
			Subject:    bank.Subject,
			CategoryID: bank.CategoryID,
			BankType:   string(bank.BankType),
			Language:   bank.Language,
			Mastery:    mastery,
		}
	}

	categoryMastery, _ := h.store.GetCategoryMastery(ctx, categoryID)

	respondJSON(w, http.StatusOK, GetCategoryResponse{
		ID:       cat.ID,
		Name:     cat.Name,
		FolderID: cat.FolderID,
		Mastery:  categoryMastery,
		Banks:    bankResponses,
	})
}

// updateCategory renames an existing category.
// @Summary      Update a category
// @Description  Update the name of an existing category.
// @Tags         Categories
// @Accept       json
// @Produce      json
// @Param        categoryID  path      string                 true  "Category ID"
// @Param        body        body      UpdateCategoryRequest   true  "New category data"
// @Success      200         {object}  CategoryResponse
// @Failure      400         {object}  map[string]string
// @Failure      404         {object}  map[string]string
// @Router       /categories/{categoryID} [put]
func (h *Handler) updateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categoryID := r.PathValue("categoryID")

	var req UpdateCategoryRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	// Fetch existing to preserve folder_id
	existing, err := h.store.GetCategory(ctx, categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	cat := &category.Category{
		ID:       categoryID,
		Name:     req.Name,
		FolderID: existing.FolderID,
	}

	if h.handleStoreError(w, h.store.UpdateCategory(ctx, cat), "category") {
		return
	}

	mastery, _ := h.store.GetCategoryMastery(ctx, categoryID)

	respondJSON(w, http.StatusOK, CategoryResponse{
		ID:       cat.ID,
		Name:     cat.Name,
		FolderID: cat.FolderID,
		Mastery:  mastery,
	})
}

// updateCategoryFolder moves a category to a different folder.
// @Summary      Update category folder
// @Description  Move a category to a different folder (or set to null to unfiled).
// @Tags         Categories
// @Accept       json
// @Produce      json
// @Param        categoryID  path      string                       true  "Category ID"
// @Param        body        body      UpdateCategoryFolderRequest   true  "New folder"
// @Success      200         {object}  CategoryResponse
// @Failure      400         {object}  map[string]string
// @Failure      404         {object}  map[string]string
// @Router       /categories/{categoryID}/folder [patch]
func (h *Handler) updateCategoryFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categoryID := r.PathValue("categoryID")

	var req UpdateCategoryFolderRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	// Validate folder exists if provided
	if req.FolderID != nil && *req.FolderID != "" {
		_, err := h.store.GetFolder(ctx, *req.FolderID)
		if h.handleStoreError(w, err, "folder") {
			return
		}
	}

	if h.handleStoreError(w, h.store.UpdateCategoryFolder(ctx, categoryID, req.FolderID), "category") {
		return
	}

	cat, _ := h.store.GetCategory(ctx, categoryID)
	mastery, _ := h.store.GetCategoryMastery(ctx, categoryID)

	respondJSON(w, http.StatusOK, CategoryResponse{
		ID:       cat.ID,
		Name:     cat.Name,
		FolderID: cat.FolderID,
		Mastery:  mastery,
	})
}

// deleteCategory removes a category and all its banks.
// @Summary      Delete a category
// @Description  Delete a category and cascade-delete all its banks and questions.
// @Tags         Categories
// @Param        categoryID  path  string  true  "Category ID"
// @Success      204
// @Failure      404  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /categories/{categoryID} [delete]
func (h *Handler) deleteCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categoryID := r.PathValue("categoryID")

	if h.handleStoreError(w, h.store.DeleteCategory(ctx, categoryID), "category") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// listBanksByCategory returns all banks in a category.
// @Summary      List banks by category
// @Description  Returns all question banks belonging to a category.
// @Tags         Categories
// @Produce      json
// @Param        categoryID  path      string  true  "Category ID"
// @Success      200         {array}   BankResponse
// @Failure      404         {object}  map[string]string
// @Failure      500         {object}  map[string]string
// @Router       /categories/{categoryID}/banks [get]
func (h *Handler) listBanksByCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categoryID := r.PathValue("categoryID")

	_, err := h.store.GetCategory(ctx, categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	banks, err := h.store.ListBanksByCategory(ctx, categoryID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load banks")
		return
	}

	response := make([]BankResponse, len(banks))
	for i, bank := range banks {
		mastery, _ := h.store.GetBankMastery(ctx, bank.ID)
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

// getCategoryStats returns mastery stats for a category.
// @Summary      Get category stats
// @Description  Returns the aggregate mastery score for a category.
// @Tags         Categories
// @Produce      json
// @Param        categoryID  path      string  true  "Category ID"
// @Success      200         {object}  CategoryStatsResponse
// @Failure      404         {object}  map[string]string
// @Failure      500         {object}  map[string]string
// @Router       /categories/{categoryID}/stats [get]
func (h *Handler) getCategoryStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categoryID := r.PathValue("categoryID")

	_, err := h.store.GetCategory(ctx, categoryID)
	if h.handleStoreError(w, err, "category") {
		return
	}

	mastery, err := h.store.GetCategoryMastery(ctx, categoryID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	respondJSON(w, http.StatusOK, CategoryStatsResponse{
		CategoryID: categoryID,
		Mastery:    mastery,
	})
}
