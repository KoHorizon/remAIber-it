// internal/service/grading.go
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/store"
)

// GradeRequest contains everything needed to grade a single answer.
type GradeRequest struct {
	SessionID      string
	QuestionID     string
	Question       string // the question text
	ExpectedAnswer string
	UserAnswer     string
	GradingPrompt  *string // optional custom prompt
	BankType       string  // "theory", "code", "cli"
}

// GradingService manages asynchronous grading of user answers.
// It owns the per-session WaitGroups so the store stays a pure
// persistence layer.
type GradingService struct {
	store  store.Store
	grader grader.Grader
	logger *slog.Logger

	mu      sync.RWMutex
	pending map[string]*sync.WaitGroup // sessionID → WaitGroup
}

// NewGradingService creates a GradingService.
func NewGradingService(s store.Store, g grader.Grader, logger *slog.Logger) *GradingService {
	return &GradingService{
		store:   s,
		grader:  g,
		logger:  logger,
		pending: make(map[string]*sync.WaitGroup),
	}
}

// TrackSession registers a session for WaitGroup tracking.
// Call this after saving a new session.
func (gs *GradingService) TrackSession(sessionID string) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	gs.pending[sessionID] = &sync.WaitGroup{}
}

// SubmitGrading sends an answer for async grading.
// The goroutine calls the LLM, parses the result, and persists the grade.
func (gs *GradingService) SubmitGrading(req GradeRequest) {
	gs.mu.RLock()
	wg, ok := gs.pending[req.SessionID]
	gs.mu.RUnlock()

	if ok {
		wg.Add(1)
	}

	go func() {
		if ok {
			defer wg.Done()
		}
		gs.grade(req)
	}()
}

// WaitForSession blocks until all grading goroutines for a session have finished.
func (gs *GradingService) WaitForSession(sessionID string) {
	gs.mu.RLock()
	wg, ok := gs.pending[sessionID]
	gs.mu.RUnlock()

	if ok {
		wg.Wait()
	}
}

// grade does the actual LLM call and persists the result.
// It uses context.Background because grading runs asynchronously
// and must not be cancelled when the originating HTTP request ends.
func (gs *GradingService) grade(req GradeRequest) {
	ctx := context.Background()

	response, err := gs.grader.GradeAnswer(
		ctx,
		req.Question,
		req.ExpectedAnswer,
		req.UserAnswer,
		req.GradingPrompt,
		req.BankType,
	)
	if err != nil {
		gs.logger.Error("grading error",
			"question_id", req.QuestionID,
			"error", err,
		)
		if saveErr := gs.store.SaveGradeFailure(ctx, req.SessionID, req.QuestionID, req.UserAnswer, err.Error()); saveErr != nil {
			gs.logger.Error("failed to save grade failure", "error", saveErr)
		}
		return
	}

	var result struct {
		Score   int      `json:"score"`
		Covered []string `json:"covered"`
		Missed  []string `json:"missed"`
	}
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		gs.logger.Error("parse error",
			"question_id", req.QuestionID,
			"error", err,
			"response", response,
		)
		if saveErr := gs.store.SaveGradeFailure(
			ctx, req.SessionID, req.QuestionID, req.UserAnswer,
			fmt.Sprintf("failed to parse grading response: %v", err),
		); saveErr != nil {
			gs.logger.Error("failed to save grade failure", "error", saveErr)
		}
		return
	}

	if err := gs.store.SaveGrade(
		ctx, req.SessionID, req.QuestionID,
		result.Score, result.Covered, result.Missed,
		req.UserAnswer,
	); err != nil {
		gs.logger.Error("failed to save grade",
			"question_id", req.QuestionID,
			"error", err,
		)
	}
}
