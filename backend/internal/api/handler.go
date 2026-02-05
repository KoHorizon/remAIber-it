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

// handleStoreError checks for common store errors and writes the appropriate
// HTTP response. Returns true if an error was handled (caller should return).
func (h *Handler) handleStoreError(w http.ResponseWriter, err error, entity string) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, store.ErrNotFound) {
		http.Error(w, entity+" not found", http.StatusNotFound)
		return true
	}
	h.logger.Error("store error", "error", err, "entity", entity)
	http.Error(w, "internal error", http.StatusInternalServerError)
	return true
}

// decodeJSON reads a JSON request body into dst.
// Returns true on success. On failure it writes a 400 response and returns false.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return false
	}
	return true
}
