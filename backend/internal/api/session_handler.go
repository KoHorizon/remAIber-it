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

type CreateQuickSessionRequest struct {
	BankIDs        []string `json:"bank_ids"`
	MaxPerBank     *int     `json:"max_per_bank,omitempty" example:"5"`
	MaxDurationMin *int     `json:"max_duration_min,omitempty" example:"15"`
}

func (r *CreateQuickSessionRequest) Validate() error {
	if len(r.BankIDs) == 0 {
		return errors.New("bank_ids is required")
	}
	return nil
}

type QuickSessionQuestion struct {
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
	BankID         string `json:"bank_id"`
	BankSubject    string `json:"bank_subject"`
	BankType       string `json:"bank_type"`
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

// createQuickSession starts a multi-bank practice session focusing on weak questions.
// @Summary      Create a quick practice session
// @Description  Create a practice session from multiple banks, focusing on weak questions.
// @Tags         Sessions
// @Accept       json
// @Produce      json
// @Param        body  body      CreateQuickSessionRequest  true  "Quick session configuration"
// @Success      201   {object}  object
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /sessions/quick [post]
func (h *Handler) createQuickSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateQuickSessionRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	maxPerBank := 5
	if req.MaxPerBank != nil && *req.MaxPerBank > 0 {
		maxPerBank = *req.MaxPerBank
	}

	// Get weak questions across all specified banks
	questionsWithBank, err := h.store.GetWeakQuestionsAcrossBanks(ctx, req.BankIDs, maxPerBank)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get questions")
		return
	}

	if len(questionsWithBank) == 0 {
		respondError(w, http.StatusBadRequest, "no questions found in specified banks")
		return
	}

	// Fetch bank metadata for response
	bankCache := make(map[string]*questionbank.QuestionBank)
	for _, bankID := range req.BankIDs {
		bank, err := h.store.GetBank(ctx, bankID)
		if err == nil {
			bankCache[bankID] = bank
		}
	}

	// Convert to domain type
	questionsWithBankID := make([]practicesession.QuestionWithBankID, len(questionsWithBank))
	for i, qwb := range questionsWithBank {
		questionsWithBankID[i] = practicesession.QuestionWithBankID{
			Question: questionbank.Question{
				ID:             qwb.ID,
				Subject:        qwb.Subject,
				ExpectedAnswer: qwb.ExpectedAnswer,
			},
			BankID: qwb.BankID,
		}
	}

	config := practicesession.DefaultConfig()
	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		duration := time.Duration(*req.MaxDurationMin) * time.Minute
		config.MaxDuration = &duration
	}

	session := practicesession.NewMultiBankSession(questionsWithBankID, config)

	if err := h.store.SaveSession(ctx, session); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save session")
		return
	}

	h.grading.TrackSession(session.ID)

	// Build response with bank metadata
	questions := make([]QuickSessionQuestion, len(session.Questions))
	for i, q := range session.Questions {
		bankID := session.QuestionBankMap[q.ID]
		bankSubject := ""
		bankType := "theory"
		if bank, ok := bankCache[bankID]; ok {
			bankSubject = bank.Subject
			bankType = string(bank.BankType)
		}
		questions[i] = QuickSessionQuestion{
			ID:             q.ID,
			Subject:        q.Subject,
			ExpectedAnswer: q.ExpectedAnswer,
			BankID:         bankID,
			BankSubject:    bankSubject,
			BankType:       bankType,
		}
	}

	response := map[string]interface{}{
		"id":            session.ID,
		"status":        string(session.Status),
		"questions":     questions,
		"focus_on_weak": session.FocusOnWeak,
		"is_multi_bank": true,
	}

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		response["max_duration_min"] = *req.MaxDurationMin
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

	// For multi-bank sessions, look up the bank per question
	var bankID string
	if session.QuestionBankId == "multi" {
		bankID, _ = h.store.GetSessionQuestionBankID(ctx, sessionID, req.QuestionID)
	} else {
		bankID = session.QuestionBankId
	}

	bank, _ := h.store.GetBank(ctx, bankID)
	var gradingPrompt *string
	var bankType string = "theory"
	if bank != nil {
		bankType = string(bank.BankType)
		// Check for question-level grading prompt first, then fallback to bank-level
		for _, bq := range bank.Questions {
			if bq.ID == question.ID && bq.GradingPrompt != nil {
				gradingPrompt = bq.GradingPrompt
				break
			}
		}
		// If no question-level prompt, use bank-level
		if gradingPrompt == nil {
			gradingPrompt = bank.GradingPrompt
		}
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
