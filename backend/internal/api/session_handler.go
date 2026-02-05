package api

import (
	"net/http"
	"time"

	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	"github.com/remaimber-it/backend/internal/service"
	"github.com/remaimber-it/backend/internal/store"
)

// ── Request / Response types ────────────────────────────────────────────────

type CreateSessionRequest struct {
	BankID         string   `json:"bank_id"`
	MaxQuestions   *int     `json:"max_questions,omitempty"`
	MaxDurationMin *int     `json:"max_duration_min,omitempty"`
	FocusOnWeak    bool     `json:"focus_on_weak"`
	QuestionIDs    []string `json:"question_ids,omitempty"`
}

type SessionQuestion struct {
	ID             string `json:"id"`
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

type CreateSessionResponse struct {
	ID             string            `json:"id"`
	Questions      []SessionQuestion `json:"questions"`
	MaxDurationMin *int              `json:"max_duration_min,omitempty"`
	FocusOnWeak    bool              `json:"focus_on_weak"`
}

type SubmitAnswerRequest struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"`
}

type SubmitAnswerResponse struct {
	Status string `json:"status"`
}

type CompleteSessionResponse struct {
	SessionID  string         `json:"session_id"`
	TotalScore int            `json:"total_score"`
	MaxScore   int            `json:"max_score"`
	Results    []GradeDetails `json:"results"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// POST /sessions
func (h *Handler) createSession(w http.ResponseWriter, r *http.Request) {
	var req CreateSessionRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	bank, err := h.store.GetBank(req.BankID)
	if h.handleStoreError(w, err, "bank") {
		return
	}

	if len(bank.Questions) == 0 {
		http.Error(w, "bank has no questions", http.StatusBadRequest)
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
			http.Error(w, "no valid questions found", http.StatusBadRequest)
			return
		}

		session = practicesession.NewWithSpecificQuestions(bank, specificQuestions, config)
	} else {
		var orderedQuestions []questionbank.Question
		if req.FocusOnWeak {
			orderedQuestions, err = h.store.GetQuestionsOrderedByMastery(req.BankID, true)
			if err != nil {
				http.Error(w, "failed to get question order", http.StatusInternalServerError)
				return
			}
		}

		session = practicesession.NewWithConfig(bank, config, orderedQuestions)
	}

	if err := h.store.SaveSession(session); err != nil {
		http.Error(w, "failed to save session", http.StatusInternalServerError)
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
		Questions:   questions,
		FocusOnWeak: session.FocusOnWeak,
	}

	if req.MaxDurationMin != nil && *req.MaxDurationMin > 0 {
		response.MaxDurationMin = req.MaxDurationMin
	}

	respondJSON(w, http.StatusCreated, response)
}

// GET /sessions/{sessionID}
func (h *Handler) getSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(sessionID)
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
		Questions: questions,
	})
}

// POST /sessions/{sessionID}/answers
func (h *Handler) submitAnswer(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	var req SubmitAnswerRequest
	if !decodeJSON(w, r, &req) {
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
		http.Error(w, "question not found in session", http.StatusNotFound)
		return
	}

	bank, _ := h.store.GetBank(session.QuestionBankId)
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

// POST /sessions/{sessionID}/complete
func (h *Handler) completeSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionID")

	session, err := h.store.GetSession(sessionID)
	if h.handleStoreError(w, err, "session") {
		return
	}

	// Wait for all grading goroutines to finish
	h.grading.WaitForSession(sessionID)

	grades, err := h.store.GetGrades(sessionID)
	if err != nil {
		http.Error(w, "failed to load grades", http.StatusInternalServerError)
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
