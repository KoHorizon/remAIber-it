package api

import (
	"errors"
	"net/http"

	"github.com/remaimber-it/backend/internal/grader"
)

// ── Request / Response types ────────────────────────────────────────────────

type GenerateQuestionsRequest struct {
	Content   string  `json:"content" example:"Go is a statically typed language..."`
	BankType  string  `json:"bank_type" example:"theory"`
	Language  *string `json:"language,omitempty" example:"go"`
	Count     int     `json:"count" example:"10"`
	Direction string  `json:"direction,omitempty" example:"Focus on practical scenarios"`
}

func (r *GenerateQuestionsRequest) Validate() error {
	if r.Content == "" {
		return errors.New("content is required")
	}
	if len(r.Content) > 50000 {
		return errors.New("content exceeds maximum length of 50000 characters")
	}
	// bank_type defaults to "theory" if empty
	// count defaults to 10 if not provided, clamped to 1-20
	return nil
}

type GenerateQuestionsResponse struct {
	Questions []grader.GeneratedQuestion `json:"questions"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// generateQuestions generates flashcard questions from study content using AI.
// @Summary      Generate questions
// @Description  Generate flashcard questions from study material using the AI model.
// @Tags         Generate
// @Accept       json
// @Produce      json
// @Param        body  body      GenerateQuestionsRequest  true  "Generation request"
// @Success      200   {object}  GenerateQuestionsResponse
// @Failure      400   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /generate/questions [post]
func (h *Handler) generateQuestions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req GenerateQuestionsRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	// Default bank_type to "theory"
	bankType := req.BankType
	if bankType == "" {
		bankType = "theory"
	}

	// Default and clamp count
	count := req.Count
	if count <= 0 {
		count = 10
	}
	if count > 20 {
		count = 20
	}

	genReq := grader.GenerateRequest{
		Content:   req.Content,
		BankType:  bankType,
		Language:  req.Language,
		Count:     count,
		Direction: req.Direction,
	}

	questions, err := h.grading.GenerateQuestions(ctx, genReq)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "generation failed: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, GenerateQuestionsResponse{
		Questions: questions,
	})
}
