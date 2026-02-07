package api

import "net/http"

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

// ── Shared response types ───────────────────────────────────────────────────

// GradeResult is used internally during async grading.
type GradeResult struct {
	QuestionID string
	Response   string
	Err        error
}

// GradeDetails appears in session completion responses.
type GradeDetails struct {
	Score      int      `json:"score"`
	Covered    []string `json:"covered"`
	Missed     []string `json:"missed"`
	UserAnswer string   `json:"user_answer"`
	Status     string   `json:"status"` // "success", "failed", or "not_answered"
}
