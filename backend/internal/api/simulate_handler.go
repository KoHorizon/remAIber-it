package api

import (
	"errors"
	"net/http"

	"github.com/remaimber-it/backend/internal/service"
)

// ── Request / Response types ────────────────────────────────────────────────

type SimulateGradeRequest struct {
	Question       string  `json:"question" example:"What is a goroutine?"`
	ExpectedAnswer string  `json:"expected_answer" example:"A goroutine is a lightweight thread managed by the Go runtime."`
	UserAnswer     string  `json:"user_answer" example:"A goroutine is a concurrent unit of execution."`
	BankType       string  `json:"bank_type" example:"theory"`
	GradingPrompt  *string `json:"grading_prompt,omitempty" example:"Be strict about mentioning the Go scheduler."`
}

func (r *SimulateGradeRequest) Validate() error {
	if r.Question == "" {
		return errors.New("question is required")
	}
	if r.ExpectedAnswer == "" {
		return errors.New("expected_answer is required")
	}
	if r.UserAnswer == "" {
		return errors.New("user_answer is required")
	}
	// bank_type defaults to "theory" if empty
	return nil
}

type SimulateGradeResponse struct {
	Score   int      `json:"score" example:"80"`
	Covered []string `json:"covered" example:"lightweight thread,concurrent execution"`
	Missed  []string `json:"missed" example:"managed by Go runtime"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// simulateGrade grades a single answer without creating a session.
// @Summary      Simulate grading
// @Description  Grade a question/answer pair without persisting anything. Useful for testing grading prompts.
// @Tags         Simulate
// @Accept       json
// @Produce      json
// @Param        body  body      SimulateGradeRequest  true  "Grading simulation request"
// @Success      200   {object}  SimulateGradeResponse
// @Failure      400   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /simulate/grade [post]
func (h *Handler) simulateGrade(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req SimulateGradeRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	// Default bank_type to "theory"
	bankType := req.BankType
	if bankType == "" {
		bankType = "theory"
	}

	gradeReq := service.GradeRequest{
		SessionID:      "", // Not used for simulation
		QuestionID:     "", // Not used for simulation
		Question:       req.Question,
		ExpectedAnswer: req.ExpectedAnswer,
		UserAnswer:     req.UserAnswer,
		GradingPrompt:  req.GradingPrompt,
		BankType:       bankType,
	}

	score, covered, missed, err := h.grading.GradeOnce(ctx, gradeReq)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "grading failed: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, SimulateGradeResponse{
		Score:   score,
		Covered: covered,
		Missed:  missed,
	})
}
