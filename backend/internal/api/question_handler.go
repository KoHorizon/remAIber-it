package api

import (
	"errors"
	"net/http"
)

// ── Request / Response types ────────────────────────────────────────────────

type AddQuestionRequest struct {
	Subject        string `json:"subject" example:"What is a goroutine?"`
	ExpectedAnswer string `json:"expected_answer" example:"A goroutine is a lightweight thread managed by the Go runtime."`
}

func (r *AddQuestionRequest) Validate() error {
	if r.Subject == "" {
		return errors.New("subject is required")
	}
	if r.ExpectedAnswer == "" {
		return errors.New("expected_answer is required")
	}
	return nil
}

type AddQuestionResponse struct {
	ID             string `json:"id" example:"q1w2e3r4t5y6u7i8"`
	Subject        string `json:"subject" example:"What is a goroutine?"`
	ExpectedAnswer string `json:"expected_answer" example:"A goroutine is a lightweight thread managed by the Go runtime."`
	Mastery        int    `json:"mastery" example:"0"`
	TimesAnswered  int    `json:"times_answered" example:"0"`
	TimesCorrect   int    `json:"times_correct" example:"0"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// addQuestion adds a new question to a bank.
// @Summary      Add a question
// @Description  Add a new question with an expected answer to a question bank.
// @Tags         Questions
// @Accept       json
// @Produce      json
// @Param        bankID  path      string              true  "Bank ID"
// @Param        body    body      AddQuestionRequest   true  "Question to add"
// @Success      201     {object}  AddQuestionResponse
// @Failure      400     {object}  map[string]string
// @Failure      404     {object}  map[string]string
// @Failure      500     {object}  map[string]string
// @Router       /banks/{bankID}/questions [post]
func (h *Handler) addQuestion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	bankID := r.PathValue("bankID")

	bank, err := h.store.GetBank(ctx, bankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	var req AddQuestionRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	if err := bank.AddQuestions(req.Subject, req.ExpectedAnswer); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	newQuestion := bank.Questions[len(bank.Questions)-1]
	if err := h.store.AddQuestion(ctx, bankID, newQuestion); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save question")
		return
	}

	respondJSON(w, http.StatusCreated, AddQuestionResponse{
		ID:             newQuestion.ID,
		Subject:        newQuestion.Subject,
		ExpectedAnswer: newQuestion.ExpectedAnswer,
		Mastery:        0,
		TimesAnswered:  0,
		TimesCorrect:   0,
	})
}

// deleteQuestion removes a question from a bank.
// @Summary      Delete a question
// @Description  Delete a question and its statistics.
// @Tags         Questions
// @Param        bankID      path  string  true  "Bank ID"
// @Param        questionID  path  string  true  "Question ID"
// @Success      204
// @Failure      404  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /banks/{bankID}/questions/{questionID} [delete]
func (h *Handler) deleteQuestion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	questionID := r.PathValue("questionID")

	if h.handleStoreError(w, h.store.DeleteQuestion(ctx, questionID), "question") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
