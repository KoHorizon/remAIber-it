package service

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/store"
)

// Generator is implemented by types that can generate questions from content.
type Generator interface {
	GenerateQuestions(ctx context.Context, req grader.GenerateRequest) ([]grader.GeneratedQuestion, error)
}

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
// persistence layer. A separate inflight WaitGroup tracks every
// goroutine regardless of session, enabling graceful shutdown.
type GradingService struct {
	store     store.Store
	grader    grader.Grader
	generator Generator
	logger    *slog.Logger

	mu       sync.RWMutex
	pending  map[string]*sync.WaitGroup // sessionID → WaitGroup
	inflight sync.WaitGroup             // tracks all grading goroutines for shutdown
}

// NewGradingService creates a GradingService.
// The generator parameter can be nil if question generation is not needed.
func NewGradingService(s store.Store, g grader.Grader, gen Generator, logger *slog.Logger) *GradingService {
	return &GradingService{
		store:     s,
		grader:    g,
		generator: gen,
		logger:    logger,
		pending:   make(map[string]*sync.WaitGroup),
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
//
// wg.Add(1) is called while holding the read-lock so that a concurrent
// WaitForSession cannot observe a "zero" WaitGroup between the unlock
// and the Add — eliminating the TOCTOU race.
func (gs *GradingService) SubmitGrading(req GradeRequest) {
	gs.mu.RLock()
	wg, ok := gs.pending[req.SessionID]
	if ok {
		wg.Add(1)
	}
	gs.mu.RUnlock()

	gs.inflight.Add(1)

	go func() {
		defer gs.inflight.Done()
		if ok {
			defer wg.Done()
		}
		gs.grade(req)
	}()
}

// WaitForSession blocks until all grading goroutines for a session have
// finished, then removes the session from the pending map to prevent
// memory leaks.
func (gs *GradingService) WaitForSession(sessionID string) {
	gs.mu.RLock()
	wg, ok := gs.pending[sessionID]
	gs.mu.RUnlock()

	if ok {
		wg.Wait()

		gs.mu.Lock()
		delete(gs.pending, sessionID)
		gs.mu.Unlock()
	}
}

// Shutdown waits for every in-flight grading goroutine to finish.
// Call this during server shutdown so LLM calls in progress are not
// abandoned and their results are persisted.
func (gs *GradingService) Shutdown() {
	gs.logger.Info("waiting for in-flight grading to complete")
	gs.inflight.Wait()
	gs.logger.Info("all grading goroutines finished")
}

// GenerateQuestions generates flashcard questions from study content.
// This is a synchronous call to the LLM for question generation.
func (gs *GradingService) GenerateQuestions(ctx context.Context, req grader.GenerateRequest) ([]grader.GeneratedQuestion, error) {
	if gs.generator == nil {
		return nil, fmt.Errorf("question generation not available")
	}
	return gs.generator.GenerateQuestions(ctx, req)
}

// GradeOnce performs a synchronous, one-shot grading without persisting results.
// This is used for simulation/testing grading prompts before adding questions.
func (gs *GradingService) GradeOnce(ctx context.Context, req GradeRequest) (score int, covered []string, missed []string, err error) {
	result, err := gs.grader.GradeAnswer(
		ctx,
		req.Question,
		req.ExpectedAnswer,
		req.UserAnswer,
		req.GradingPrompt,
		req.BankType,
	)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("grading error: %w", err)
	}

	return result.Score, result.Covered, result.Missed, nil
}

// grade does the actual LLM call and persists the result.
// It uses context.Background because grading runs asynchronously
// and must not be cancelled when the originating HTTP request ends.
func (gs *GradingService) grade(req GradeRequest) {
	ctx := context.Background()

	result, err := gs.grader.GradeAnswer(
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

	// No parse step here: GradeAnswer returns grader.GradeResult directly.
	// Malformed LLM output is the grader's problem and surfaces as an error above.

	if err := gs.store.SaveGrade(
		ctx, req.SessionID, req.QuestionID,
		result.Score, result.Covered, result.Missed,
		req.UserAnswer,
	); err != nil {
		gs.logger.Error("failed to save grade",
			"question_id", req.QuestionID,
			"error", err,
		)
		// Record the failure so the question shows as "grading failed"
		// rather than silently reading as unanswered with a score of 0.
		if saveErr := gs.store.SaveGradeFailure(
			ctx, req.SessionID, req.QuestionID, req.UserAnswer,
			fmt.Sprintf("failed to save grade: %v", err),
		); saveErr != nil {
			gs.logger.Error("failed to save grade failure", "error", saveErr)
		}
	}
}
