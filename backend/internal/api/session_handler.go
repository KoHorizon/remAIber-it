package api

import (
	"errors"
	"net/http"
	"time"

	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/service"
	"github.com/remaimber-it/backend/internal/store"
)

// ── Request / Response types ────────────────────────────────────────────────

type CreateSessionRequest struct {
	BankID         string   `json:"bank_id" example:"x9y8z7w6v5u4t3s2"`
	MaxQuestions   *int     `json:"max_questions,omitempty" example:"10"`
	MaxDurationMin *int     `json:"max_duration_min,omitempty" example:"15"`
	FocusOnWeak    bool     `json:"focus_on_weak" example:"false"`
	QuestionIDs    []string `json:"question_ids,omitempty"`
}

func (r *CreateSessionRequest) Validate() error {
	if r.BankID == "" {
		return errors.New("bank_id is required")
	}
	return nil
}

type SessionQuestion struct {
	ID             string `json:"id" example:"q1w2e3r4t5y6u7i8"`
	Subject        string `json:"subject" example:"What is a goroutine?"`
	ExpectedAnswer string `json:"expected_answer" example:"A goroutine is a lightweight thread managed by the Go runtime."`
}

type CreateSessionResponse struct {
	ID             string            `json:"id" example:"s1e2s3s4i5o6n7id"`
	Status         string            `json:"status" example:"active"`
	Questions      []SessionQuestion `json:"questions"`
	MaxDurationMin *int              `json:"max_duration_min,omitempty" example:"15"`
	FocusOnWeak    bool              `json:"focus_on_weak" example:"false"`
}

type SubmitAnswerRequest struct {
	QuestionID string `json:"question_id" example:"q1w2e3r4t5y6u7i8"`
	Answer     string `json:"answer" example:"A goroutine is a lightweight concurrent unit of execution."`
}

func (r *SubmitAnswerRequest) Validate() error {
	if r.QuestionID == "" {
		return errors.New("question_id is required")
	}
	if r.Answer == "" {
		return errors.New("answer is required")
	}
	return nil
}

type SubmitAnswerResponse struct {
	Status string `json:"status" example:"submitted"`
}

type CompleteSessionResponse struct {
	SessionID  string         `json:"session_id" example:"s1e2s3s4i5o6n7id"`
	TotalScore int            `json:"total_score" example:"150"`
	MaxScore   int            `json:"max_score" example:"300"`
	Results    []GradeDetails `json:"results"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// createSession starts a new practice session.
// @Summary      Create a practice session
// @Description  Create a practice session from a question bank. Optionally limit question count, set a timer, focus on weak questions, or pick specific question IDs.
// @Tags         Sessions
// @Accept       json
// @Produce      json
// @Param        body  body      CreateSessionRequest  true  "Session configuration"
// @Success      201   {object}  CreateSessionResponse
// @Failure      400   {object}  map[string]string
// @Failure      404   {object}  map[string]string  "bank not found"
// @Failure      500   {object}  map[string]string
// @Router       /sessions [post]
func (h *Handler) createSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateSessionRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	bank, err := h.store.GetBank(ctx, req.BankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	if len(bank.Questions) == 0 {
		respondError(w, http.StatusBadRequest, "bank has no questions")
		return
	}

	config := practicesession.DefaultConfig()

	if req.MaxQuestions != nil && *req.MaxQuestions > 0 {
		config.MaxQuestions = req.MaxQuestions
	}

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		duration := time.Duration(*req.MaxDurationMin) * time.Minute
		config.MaxDuration = &duration
	}

	config.FocusOnWeak = req.FocusOnWeak

	var session *practicesession.PracticeSession

	if len(req.QuestionIDs) > 0 {
		questionMap := make(map[string]questionbank.Question)
		for _, q := range bank.Questions {
			questionMap[q.ID] = q
		}

		var specificQuestions []questionbank.Question
		for _, qid := range req.QuestionIDs {
			if q, ok := questionMap[qid]; ok {
				specificQuestions = append(specificQuestions, q)
			}
		}

		if len(specificQuestions) == 0 {
			respondError(w, http.StatusBadRequest, "no valid questions found")
			return
		}

		session = practicesession.NewWithSpecificQuestions(bank, specificQuestions, config)
	} else {
		var orderedQuestions []questionbank.Question
		if req.FocusOnWeak {
			orderedQuestions, err = h.store.GetQuestionsOrderedByMastery(ctx, req.BankID, true)
			if err != nil {
				respondError(w, http.StatusInternalServerError, "failed to get question order")
				return
			}
		}

		session = practicesession.NewWithConfig(bank, config, orderedQuestions)
	}

	if err := h.store.SaveSession(ctx, session); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save session")
		return
	}

	h.grading.TrackSession(session.ID)

	questions := make([]SessionQuestion, len(session.Questions))
	for i, q := range session.Questions {
		questions[i] = SessionQuestion{
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
		}
	}

	response := CreateSessionResponse{
		ID:          session.ID,
		Status:      string(session.Status),
		Questions:   questions,
		FocusOnWeak: session.FocusOnWeak,
	}

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		response.MaxDurationMin = req.MaxDurationMin
	}

	respondJSON(w, http.StatusCreated, response)
}

// getSession returns a session and its questions.
// @Summary      Get a session
// @Description  Returns a practice session with its questions.
// @Tags         Sessions
// @Produce      json
// @Param        sessionID  path      string  true  "Session ID"
// @Success      200        {object}  CreateSessionResponse
// @Failure      404        {object}  map[string]string
// @Router       /sessions/{sessionID} [get]
func (h *Handler) getSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(ctx, sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	questions := make([]SessionQuestion, len(session.Questions))
	for i, q := range session.Questions {
		questions[i] = SessionQuestion{
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
		}
	}

	respondJSON(w, http.StatusOK, CreateSessionResponse{
		ID:        session.ID,
		Status:    string(session.Status),
		Questions: questions,
	})
}

// submitAnswer submits an answer for async LLM grading.
// @Summary      Submit an answer
// @Description  Submit a user answer for a question in the session. The answer is graded asynchronously by an LLM.
// @Tags         Sessions
// @Accept       json
// @Produce      json
// @Param        sessionID  path      string               true  "Session ID"
// @Param        body       body      SubmitAnswerRequest   true  "Answer to submit"
// @Success      200        {object}  SubmitAnswerResponse
// @Failure      400        {object}  map[string]string
// @Failure      404        {object}  map[string]string
// @Failure      409        {object}  map[string]string  "session already completed"
// @Router       /sessions/{sessionID}/answers [post]
func (h *Handler) submitAnswer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(ctx, sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	if !session.IsActive() {
		respondError(w, http.StatusConflict, "session is already completed")
		return
	}

	var req SubmitAnswerRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	var question *questionbank.Question
	for _, q := range session.Questions {
		if q.ID == req.QuestionID {
			question = &q
			break
		}
	}

	if question == nil {
		respondError(w, http.StatusNotFound, "question not found in session")
		return
	}

	bank, _ := h.store.GetBank(ctx, session.QuestionBankId)
	var gradingPrompt *string
	var bankType string = "theory"
	if bank != nil {
		gradingPrompt = bank.GradingPrompt
		bankType = string(bank.BankType)
	}

	h.grading.SubmitGrading(service.GradeRequest{
		SessionID:      sessionID,
		QuestionID:     question.ID,
		Question:       question.Subject,
		ExpectedAnswer: question.ExpectedAnswer,
		UserAnswer:     req.Answer,
		GradingPrompt:  gradingPrompt,
		BankType:       bankType,
	})

	respondJSON(w, http.StatusOK, SubmitAnswerResponse{
		Status: "submitted",
	})
}

// completeSession finalises a session and returns grading results.
// @Summary      Complete a session
// @Description  Mark the session as completed, wait for all pending grading to finish, and return results.
// @Tags         Sessions
// @Produce      json
// @Param        sessionID  path      string  true  "Session ID"
// @Success      200        {object}  CompleteSessionResponse
// @Failure      404        {object}  map[string]string
// @Failure      409        {object}  map[string]string  "session already completed"
// @Failure      500        {object}  map[string]string
// @Router       /sessions/{sessionID}/complete [post]
func (h *Handler) completeSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(ctx, sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	// Transition session to completed — fails if already completed.
	if err := h.store.CompleteSession(ctx, sessionID); err != nil {
		if errors.Is(err, store.ErrSessionCompleted) {
			respondError(w, http.StatusConflict, "session is already completed")
			return
		}
		h.logger.Error("failed to complete session", "error", err)
		respondError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Wait for all grading goroutines to finish
	h.grading.WaitForSession(sessionID)

	grades, err := h.store.GetGrades(ctx, sessionID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load grades")
		return
	}

	gradedQuestions := make(map[string]store.StoredGrade)
	for _, g := range grades {
		gradedQuestions[g.QuestionID] = g
	}

	results := make([]GradeDetails, len(session.Questions))
	totalScore := 0

	for i, q := range session.Questions {
		if grade, answered := gradedQuestions[q.ID]; answered {
			status := "success"
			if grade.Status == store.GradeStatusFailed {
				status = "failed"
			}
			results[i] = GradeDetails{
				Score:      grade.Score,
				Covered:    grade.Covered,
				Missed:     grade.Missed,
				UserAnswer: grade.UserAnswer,
				Status:     status,
			}
			totalScore += grade.Score
		} else {
			results[i] = GradeDetails{
				Score:      0,
				Covered:    []string{},
				Missed:     []string{"Not answered"},
				UserAnswer: "",
				Status:     "not_answered",
			}
		}
	}

	maxScore := len(session.Questions) * 100

	respondJSON(w, http.StatusOK, CompleteSessionResponse{
		SessionID:  sessionID,
		TotalScore: totalScore,
		MaxScore:   maxScore,
		Results:    results,
	})
}
