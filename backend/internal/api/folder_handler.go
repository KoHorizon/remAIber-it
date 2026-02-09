package api

import (
	"errors"
	"net/http"

	"github.com/remaimber-it/backend/internal/domain/folder"
)

// ── Request / Response types ────────────────────────────────────────────────

type CreateFolderRequest struct {
	Name string `json:"name" example:"Programming"`
}

func (r *CreateFolderRequest) Validate() error {
	if r.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

type FolderResponse struct {
	ID      string `json:"id" example:"f1o2l3d4e5r6i7d8"`
	Name    string `json:"name" example:"Programming"`
	Mastery int    `json:"mastery" example:"42"`
}

type GetFolderResponse struct {
	ID         string             `json:"id" example:"f1o2l3d4e5r6i7d8"`
	Name       string             `json:"name" example:"Programming"`
	Mastery    int                `json:"mastery" example:"42"`
	Categories []CategoryResponse `json:"categories"`
}

type UpdateFolderRequest struct {
	Name string `json:"name" example:"DevOps"`
}

func (r *UpdateFolderRequest) Validate() error {
	if r.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

type FolderStatsResponse struct {
	FolderID string `json:"folder_id" example:"f1o2l3d4e5r6i7d8"`
	Mastery  int    `json:"mastery" example:"42"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// createFolder creates a new folder.
// @Summary      Create a folder
// @Description  Create a new folder for grouping categories.
// @Tags         Folders
// @Accept       json
// @Produce      json
// @Param        body  body      CreateFolderRequest  true  "Folder to create"
// @Success      201   {object}  FolderResponse
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /folders [post]
func (h *Handler) createFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateFolderRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	f := folder.New(req.Name)
	if err := h.store.SaveFolder(ctx, f); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save folder")
		return
	}

	respondJSON(w, http.StatusCreated, FolderResponse{
		ID:      f.ID,
		Name:    f.Name,
		Mastery: 0,
	})
}

// listFolders lists all folders.
// @Summary      List folders
// @Description  Returns all folders with their mastery scores.
// @Tags         Folders
// @Produce      json
// @Success      200  {array}   FolderResponse
// @Failure      500  {object}  map[string]string
// @Router       /folders [get]
func (h *Handler) listFolders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folders, err := h.store.ListFolders(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load folders")
		return
	}

	response := make([]FolderResponse, len(folders))
	for i, f := range folders {
		mastery, _ := h.store.GetFolderMastery(ctx, f.ID)
		response[i] = FolderResponse{
			ID:      f.ID,
			Name:    f.Name,
			Mastery: mastery,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

// getFolder returns a single folder with its categories.
// @Summary      Get a folder
// @Description  Returns a folder with all its categories.
// @Tags         Folders
// @Produce      json
// @Param        folderID  path      string  true  "Folder ID"
// @Success      200       {object}  GetFolderResponse
// @Failure      404       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /folders/{folderID} [get]
func (h *Handler) getFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folderID := r.PathValue("folderID")

	f, err := h.store.GetFolder(ctx, folderID)
	if h.handleStoreError(w, err, "folder") {
		return
	}

	categories, err := h.store.ListCategoriesByFolder(ctx, folderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}

	catResponses := make([]CategoryResponse, len(categories))
	for i, cat := range categories {
		mastery, _ := h.store.GetCategoryMastery(ctx, cat.ID)
		catResponses[i] = CategoryResponse{
			ID:      cat.ID,
			Name:    cat.Name,
			Mastery: mastery,
		}
	}

	folderMastery, _ := h.store.GetFolderMastery(ctx, folderID)

	respondJSON(w, http.StatusOK, GetFolderResponse{
		ID:         f.ID,
		Name:       f.Name,
		Mastery:    folderMastery,
		Categories: catResponses,
	})
}

// updateFolder renames an existing folder.
// @Summary      Update a folder
// @Description  Update the name of an existing folder.
// @Tags         Folders
// @Accept       json
// @Produce      json
// @Param        folderID  path      string               true  "Folder ID"
// @Param        body      body      UpdateFolderRequest   true  "New folder data"
// @Success      200       {object}  FolderResponse
// @Failure      400       {object}  map[string]string
// @Failure      404       {object}  map[string]string
// @Router       /folders/{folderID} [put]
func (h *Handler) updateFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folderID := r.PathValue("folderID")

	var req UpdateFolderRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	f := &folder.Folder{
		ID:   folderID,
		Name: req.Name,
	}

	if h.handleStoreError(w, h.store.UpdateFolder(ctx, f), "folder") {
		return
	}

	mastery, _ := h.store.GetFolderMastery(ctx, folderID)

	respondJSON(w, http.StatusOK, FolderResponse{
		ID:      f.ID,
		Name:    f.Name,
		Mastery: mastery,
	})
}

// deleteFolder removes a folder. Categories in the folder become uncategorized (folder_id set to NULL).
// @Summary      Delete a folder
// @Description  Delete a folder. Categories inside are NOT deleted — their folder_id is set to null.
// @Tags         Folders
// @Param        folderID  path  string  true  "Folder ID"
// @Success      204
// @Failure      404  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /folders/{folderID} [delete]
func (h *Handler) deleteFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folderID := r.PathValue("folderID")

	if h.handleStoreError(w, h.store.DeleteFolder(ctx, folderID), "folder") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// listCategoriesByFolder returns all categories in a folder.
// @Summary      List categories by folder
// @Description  Returns all categories belonging to a folder.
// @Tags         Folders
// @Produce      json
// @Param        folderID  path      string  true  "Folder ID"
// @Success      200       {array}   CategoryResponse
// @Failure      404       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /folders/{folderID}/categories [get]
func (h *Handler) listCategoriesByFolder(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folderID := r.PathValue("folderID")

	_, err := h.store.GetFolder(ctx, folderID)
	if h.handleStoreError(w, err, "folder") {
		return
	}

	categories, err := h.store.ListCategoriesByFolder(ctx, folderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}

	response := make([]CategoryResponse, len(categories))
	for i, cat := range categories {
		mastery, _ := h.store.GetCategoryMastery(ctx, cat.ID)
		response[i] = CategoryResponse{
			ID:      cat.ID,
			Name:    cat.Name,
			Mastery: mastery,
		}
	}

	respondJSON(w, http.StatusOK, response)
}

// getFolderStats returns mastery stats for a folder.
// @Summary      Get folder stats
// @Description  Returns the aggregate mastery score for a folder.
// @Tags         Folders
// @Produce      json
// @Param        folderID  path      string  true  "Folder ID"
// @Success      200       {object}  FolderStatsResponse
// @Failure      404       {object}  map[string]string
// @Failure      500       {object}  map[string]string
// @Router       /folders/{folderID}/stats [get]
func (h *Handler) getFolderStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folderID := r.PathValue("folderID")

	_, err := h.store.GetFolder(ctx, folderID)
	if h.handleStoreError(w, err, "folder") {
		return
	}

	mastery, err := h.store.GetFolderMastery(ctx, folderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	respondJSON(w, http.StatusOK, FolderStatsResponse{
		FolderID: folderID,
		Mastery:  mastery,
	})
}
