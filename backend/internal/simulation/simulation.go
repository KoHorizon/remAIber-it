// simulation/simulation.go
package simulation

import (
	"encoding/json"
	"fmt"
	"sync"

	practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
	ollama "github.com/remaimber-it/backend/internal/llm-grader"
	"github.com/remaimber-it/backend/internal/worker"
)

var (
    pool     *worker.Pool[OllamaResponse]
    sessions = make(map[string]*practicesession.PracticeSession)
    answers  = make(map[string][]practicesession.SessionAnswer)
    mu       sync.Mutex
)

func init() {
    pool = worker.NewPool[OllamaResponse](3, 10)
}

type OllamaResponse struct {
    QuestionID string
    Response string
    Err error
}

func SimulateWork() {
	// POST Add new bank with question content
    bank := questionbank.New("Go Fundamentals")
    bank.AddQuestions("What is a goroutine?", "A goroutine is a lightweight thread managed by the Go runtime")
    bank.AddQuestions("What is a channel?", "A channel is a typed conduit for sending and receiving values between goroutines")

    
    // POST Create a session
    session := createSession(bank)
    fmt.Printf("Session started: %s\n", session.ID)

    // POST Anwser to question fron session
    submitAnswer(session.ID, session.Questions[0], "A goroutine is managed by the Go runtime and is a lightweight thread")
    submitAnswer(session.ID, session.Questions[1], "Un channel en Go est un conduit typé qui permet d'envoyer et de recevoir des valeurs entre les goroutines.")

    // This is not an API Call, this execute at the last question of the session
    completeSession(session.ID)
}

func createSession(bank *questionbank.QuestionBank) *practicesession.PracticeSession {
    session := practicesession.New(bank)
    mu.Lock()
    sessions[session.ID] = session
    answers[session.ID] = []practicesession.SessionAnswer{}
    mu.Unlock()
    return session
}

func submitAnswer(sessionID string, question questionbank.Question, userResponse string) {
    mu.Lock()
    answers[sessionID] = append(answers[sessionID], practicesession.SessionAnswer{
        SessionID:    sessionID,
        QuestionID:   question.ID,
        UserResponse: userResponse,
    })
    mu.Unlock()

    pool.Submit(question.ID, func() OllamaResponse {
        response, err := ollama.GradeAnswer(question.Subject, question.ExpectedAnswer, userResponse)
        return OllamaResponse{
            QuestionID: question.ID,
            Response:   response,
            Err:        err,
        }
    })
}


type SessionResult struct {
    SessionID string
    Details   []OllamaResponse
}

type GradeDetails struct {
    Score   int      `json:"score"`
    Covered []string `json:"covered"`
    Missed  []string `json:"missed"`
}


func completeSession(sessionID string) SessionResult {
    mu.Lock()
    sessionAnswers := answers[sessionID]
    mu.Unlock()

    var details []OllamaResponse

    for i := 0; i < len(sessionAnswers); i++ {
        result := <-pool.Results()
        if result.Output.Err != nil {
            fmt.Printf("Grading error for %s: %v\n", result.Output.QuestionID, result.Output.Err)
            continue
        }

        // Parse and pretty print
        var grade GradeDetails
        if err := json.Unmarshal([]byte(result.Output.Response), &grade); err == nil {
            fmt.Printf("\n=== Question %s ===\n", result.Output.QuestionID)
            fmt.Printf("Score: %d/100\n", grade.Score)
            fmt.Printf("Covered: %v\n", grade.Covered)
            fmt.Printf("Missed: %v\n", grade.Missed)
        }

        details = append(details, result.Output)
    }

    return SessionResult{
        SessionID: sessionID,
        Details:   details,
    }
}