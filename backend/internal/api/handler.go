// internal/api/handler.go
package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/remaimber-it/backend/internal/service"
	"github.com/remaimber-it/backend/internal/store"
)

// Handler holds all dependencies needed by HTTP handlers.
// Instead of relying on package-level globals, every handler method
// receives its dependencies through this struct.
type Handler struct {
	store   store.Store
	grading *service.GradingService
	logger  *slog.Logger
}

// NewHandler creates a Handler with the given dependencies.
// It accepts the Store interface so any implementation (SQLite, mock, …)
// can be injected.
func NewHandler(s store.Store, gs *service.GradingService, logger *slog.Logger) *Handler {
	return &Handler{
		store:   s,
		grading: gs,
		logger:  logger,
	}
}

// respondJSON writes a JSON response with the given status code.
func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// respondError writes a structured JSON error response.
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// handleStoreError checks for common store errors and writes the appropriate
// HTTP response. Returns true if an error was handled (caller should return).
func (h *Handler) handleStoreError(w http.ResponseWriter, err error, entity string) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, store.ErrNotFound) {
		respondError(w, http.StatusNotFound, entity+" not found")
		return true
	}
	h.logger.Error("store error", "error", err, "entity", entity)
	respondError(w, http.StatusInternalServerError, "internal error")
	return true
}

// Validatable is implemented by request types that can validate themselves.
type Validatable interface {
	Validate() error
}

// decodeJSON reads a JSON request body into dst.
// Returns true on success. On failure it writes a 400 response and returns false.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json")
		return false
	}
	return true
}

// decodeAndValidate decodes a JSON request body and validates it.
// If dst implements Validatable, Validate() is called automatically.
// Returns true on success. On failure it writes a 400 response and returns false.
func decodeAndValidate(w http.ResponseWriter, r *http.Request, dst Validatable) bool {
	if !decodeJSON(w, r, dst) {
		return false
	}
	if err := dst.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return false
	}
	return true
}
