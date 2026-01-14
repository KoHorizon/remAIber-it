// internal/api/routes.go
package api

import (
    "encoding/json"
    "errors"
    "net/http"

    practicesession "github.com/remaimber-it/backend/internal/domain/practice_session"
    "github.com/remaimber-it/backend/internal/domain/questionbank"
    ollama "github.com/remaimber-it/backend/internal/llm-grader"
    "github.com/remaimber-it/backend/internal/store"
)

var (
    db   *store.Store
)

func init() {
    db = store.New()
}

type GradeResult struct {
    QuestionID string
    Response   string
    Err        error
}

type GradeDetails struct {
    Score   int      `json:"score"`
    Covered []string `json:"covered"`
    Missed  []string `json:"missed"`
}

func RegisterRoutes(mux *http.ServeMux) {
    mux.HandleFunc("POST /banks", createBank)
    mux.HandleFunc("GET /banks", listBanks)
    mux.HandleFunc("GET /banks/{bankID}", getBank)
    mux.HandleFunc("POST /banks/{bankID}/questions", addQuestion)
    mux.HandleFunc("POST /sessions", createSession)
    mux.HandleFunc("GET /sessions/{sessionID}", getSession)
    mux.HandleFunc("POST /sessions/{sessionID}/answers", submitAnswer)
    mux.HandleFunc("POST /sessions/{sessionID}/complete", completeSession)
}

// POST /banks
type CreateBankRequest struct {
    Subject string `json:"subject"`
}

type CreateBankResponse struct {
    ID      string `json:"id"`
    Subject string `json:"subject"`
}

func createBank(w http.ResponseWriter, r *http.Request) {
    var req CreateBankRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }

    bank := questionbank.New(req.Subject)
    db.SaveBank(bank)

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(CreateBankResponse{
        ID:      bank.ID,
        Subject: bank.Subject,
    })
}

// GET /banks
func listBanks(w http.ResponseWriter, r *http.Request) {
    banks := db.ListBanks()

    response := make([]CreateBankResponse, len(banks))
    for i, bank := range banks {
        response[i] = CreateBankResponse{
            ID:      bank.ID,
            Subject: bank.Subject,
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// GET /banks/{bankID}
type GetBankResponse struct {
    ID        string             `json:"id"`
    Subject   string             `json:"subject"`
    Questions []QuestionResponse `json:"questions"`
}

func getBank(w http.ResponseWriter, r *http.Request) {
    bankID := r.PathValue("bankID")

    bank, err := db.GetBank(bankID)
    if errors.Is(err, store.ErrNotFound) {
        http.Error(w, "bank not found", http.StatusNotFound)
        return
    }

    questions := make([]QuestionResponse, len(bank.Questions))
    for i, q := range bank.Questions {
        questions[i] = QuestionResponse{
            ID:      q.ID,
            Subject: q.Subject,
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(GetBankResponse{
        ID:        bank.ID,
        Subject:   bank.Subject,
        Questions: questions,
    })
}

// POST /banks/{bankID}/questions
type AddQuestionRequest struct {
    Subject        string `json:"subject"`
    ExpectedAnswer string `json:"expected_answer"`
}

type AddQuestionResponse struct {
    ID             string `json:"id"`
    Subject        string `json:"subject"`
    ExpectedAnswer string `json:"expected_answer"`
}

func addQuestion(w http.ResponseWriter, r *http.Request) {
    bankID := r.PathValue("bankID")

    bank, err := db.GetBank(bankID)
    if errors.Is(err, store.ErrNotFound) {
        http.Error(w, "bank not found", http.StatusNotFound)
        return
    }

    var req AddQuestionRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }

    if err := bank.AddQuestions(req.Subject, req.ExpectedAnswer); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    lastQuestion := bank.Questions[len(bank.Questions)-1]

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(AddQuestionResponse{
        ID:             lastQuestion.ID,
        Subject:        lastQuestion.Subject,
        ExpectedAnswer: lastQuestion.ExpectedAnswer,
    })
}

// POST /sessions
type CreateSessionRequest struct {
    BankID string `json:"bank_id"`
}

type QuestionResponse struct {
    ID      string `json:"id"`
    Subject string `json:"subject"`
}

type CreateSessionResponse struct {
    ID        string             `json:"id"`
    Questions []QuestionResponse `json:"questions"`
}

func createSession(w http.ResponseWriter, r *http.Request) {
    var req CreateSessionRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
        return
    }

    bank, err := db.GetBank(req.BankID)
    if errors.Is(err, store.ErrNotFound) {
        http.Error(w, "bank not found", http.StatusNotFound)
        return
    }

    session := practicesession.New(bank)
    db.SaveSession(session)

    questions := make([]QuestionResponse, len(session.Questions))
    for i, q := range session.Questions {
        questions[i] = QuestionResponse{
            ID:      q.ID,
            Subject: q.Subject,
        }
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(CreateSessionResponse{
        ID:        session.ID,
        Questions: questions,
    })
}

// GET /sessions/{sessionID}
func getSession(w http.ResponseWriter, r *http.Request) {
    sessionID := r.PathValue("sessionID")

    session, err := db.GetSession(sessionID)
    if errors.Is(err, store.ErrNotFound) {
        http.Error(w, "session not found", http.StatusNotFound)
        return
    }

    questions := make([]QuestionResponse, len(session.Questions))
    for i, q := range session.Questions {
        questions[i] = QuestionResponse{
            ID:      q.ID,
            Subject: q.Subject,
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(CreateSessionResponse{
        ID:        session.ID,
        Questions: questions,
    })
}

// POST /sessions/{sessionID}/answers
type SubmitAnswerRequest struct {
    QuestionID string `json:"question_id"`
    Response   string `json:"response"`
}

type SubmitAnswerResponse struct {
    Status string `json:"status"`
}

func submitAnswer(w http.ResponseWriter, r *http.Request) {
    sessionID := r.PathValue("sessionID")

    session, err := db.GetSession(sessionID)
    if errors.Is(err, store.ErrNotFound) {
        http.Error(w, "session not found", http.StatusNotFound)
        return
    }

    var req SubmitAnswerRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid json", http.StatusBadRequest)
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
        http.Error(w, "question not found", http.StatusNotFound)
        return
    }

    // Grade immediately
    go func() {
         response, err := ollama.GradeAnswer(question.Subject, question.ExpectedAnswer, req.Response)
         if err != nil {
             return // or log it
         }
 
         var grade GradeDetails
         if err := json.Unmarshal([]byte(response), &grade); err != nil {
             return
         }
 
         db.AddGrade(sessionID, store.StoredGrade{
             QuestionID: req.QuestionID,
             Score:      grade.Score,
             Covered:    grade.Covered,
             Missed:     grade.Missed,
         })
     }()

    // Return grade to user
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(SubmitAnswerResponse{
        Status: "submitted",
    })
}

// POST /sessions/{sessionID}/complete
type CompleteSessionResponse struct {
    SessionID  string         `json:"session_id"`
    TotalScore int            `json:"total_score"`
    MaxScore   int            `json:"max_score"`
    Results    []GradeDetails `json:"results"`
}

func completeSession(w http.ResponseWriter, r *http.Request) {
    sessionID := r.PathValue("sessionID")

    grades, err := db.GetGrades(sessionID)
    if errors.Is(err, store.ErrNotFound) {
        http.Error(w, "session not found", http.StatusNotFound)
        return
    }

    totalScore := 0
    for _, g := range grades {
        totalScore += g.Score
    }

    results := make([]GradeDetails, len(grades))
    for i, g := range grades {
        results[i] = GradeDetails{
            Score:   g.Score,
            Covered: g.Covered,
            Missed:  g.Missed,
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(CompleteSessionResponse{
        SessionID:  sessionID,
        TotalScore: totalScore,
        MaxScore:   len(grades) * 100,
        Results:    results,
    })
}