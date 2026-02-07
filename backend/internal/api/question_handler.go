package api

import (
	"errors"
	"net/http"
)

// ── Request / Response types ────────────────────────────────────────────────

type AddQuestionRequest struct {
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
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
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
	Mastery        int    `json:"mastery"`
	TimesAnswered  int    `json:"times_answered"`
	TimesCorrect   int    `json:"times_correct"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// POST /banks/{bankID}/questions
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

// DELETE /banks/{bankID}/questions/{questionID}
func (h *Handler) deleteQuestion(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	questionID := r.PathValue("questionID")

	if h.handleStoreError(w, h.store.DeleteQuestion(ctx, questionID), "question") {
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
