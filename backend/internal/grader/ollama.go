package grader

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"
)

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type OllamaGrader struct {
	url    string
	model  string
	client *http.Client
}

var _ Grader = (*OllamaGrader)(nil)

type GradeResult struct {
	Score   int      `json:"score"`
	Covered []string `json:"covered"`
	Missed  []string `json:"missed"`
}

type GradeError struct {
	Reason  string
	Wrapped error
}

func (e *GradeError) Error() string {
	if e.Wrapped != nil {
		return fmt.Sprintf("grading failed: %s: %v", e.Reason, e.Wrapped)
	}
	return fmt.Sprintf("grading failed: %s", e.Reason)
}

func (e *GradeError) Unwrap() error { return e.Wrapped }

// -----------------------------------------------------------------------------
// Constructor
// -----------------------------------------------------------------------------

func NewOllamaGrader(url, model string) *OllamaGrader {
	return &OllamaGrader{
		url:   url,
		model: model,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

const maxRetries = 2

func (g *OllamaGrader) GradeAnswer(ctx context.Context, question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (string, error) {
	customRules := ""
	hasCustomRules := customPrompt != nil && *customPrompt != ""
	if hasCustomRules {
		customRules = *customPrompt
	}

	var prompt string
	switch bankType {
	case "code":
		prompt = buildSemanticCodePrompt(question, expectedAnswer, userAnswer, customRules)
	case "cli":
		prompt = buildCLIPrompt(question, expectedAnswer, userAnswer, customRules)
	default:
		prompt = buildTheoryPrompt(question, expectedAnswer, userAnswer, customRules)
	}

	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err := g.callLLM(ctx, prompt)
		if err != nil {
			lastErr = err
			continue
		}

		jsonStr := extractJSON(result)
		if jsonStr == "" {
			lastErr = &GradeError{Reason: "no JSON object found in LLM response"}
			continue
		}

		var gradeResult GradeResult
		if err := json.Unmarshal([]byte(jsonStr), &gradeResult); err != nil {
			lastErr = &GradeError{Reason: "invalid JSON from LLM", Wrapped: err}
			continue
		}

		if len(gradeResult.Covered) == 0 && len(gradeResult.Missed) == 0 {
			gradeResult.Missed = []string{"Unable to evaluate"}
		}

		// If custom rules were provided, trust the LLM's score field directly.
		// Otherwise, calculate score from covered/missed counts.
		var score int
		if hasCustomRules && gradeResult.Score >= 0 && gradeResult.Score <= 100 {
			score = gradeResult.Score
		} else {
			total := len(gradeResult.Covered) + len(gradeResult.Missed)
			if total > 0 {
				score = (len(gradeResult.Covered) * 100) / total
			}
		}

		finalResult := map[string]interface{}{
			"score":   score,
			"covered": gradeResult.Covered,
			"missed":  gradeResult.Missed,
		}

		resultJSON, _ := json.Marshal(finalResult)
		return string(resultJSON), nil
	}

	return "", &GradeError{
		Reason:  fmt.Sprintf("failed after %d attempts", maxRetries),
		Wrapped: lastErr,
	}
}

// -----------------------------------------------------------------------------
// LLM Communication
// -----------------------------------------------------------------------------

type llmRequest struct {
	Model       string       `json:"model"`
	Messages    []llmMessage `json:"messages"`
	Temperature float64      `json:"temperature"`
}

type llmMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type llmResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (g *OllamaGrader) callLLM(ctx context.Context, prompt string) (string, error) {
	reqBody := llmRequest{
		Model: g.model,
		Messages: []llmMessage{{
			Role:    "user",
			Content: prompt,
		}},
		Temperature: 0,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.url+"/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("LLM request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LLM returned status %d", resp.StatusCode)
	}

	var llmResp llmResponse
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		return "", fmt.Errorf("failed to decode LLM response: %w", err)
	}

	if len(llmResp.Choices) == 0 {
		return "", fmt.Errorf("LLM returned no choices")
	}

	content := llmResp.Choices[0].Message.Content
	if content == "" {
		return "", fmt.Errorf("LLM returned empty content")
	}

	return content, nil
}

// -----------------------------------------------------------------------------
// JSON Extraction (unchanged, already correct)
// -----------------------------------------------------------------------------

func extractJSON(s string) string {
	start := -1
	depth := 0
	inString := false
	escaped := false

	for i, ch := range s {
		if escaped {
			escaped = false
			continue
		}
		if ch == '\\' && inString {
			escaped = true
			continue
		}
		if ch == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}

		if ch == '{' {
			if depth == 0 {
				start = i
			}
			depth++
		} else if ch == '}' {
			depth--
			if depth == 0 && start != -1 {
				return s[start : i+1]
			}
		}
	}
	return ""
}

// -----------------------------------------------------------------------------
// Prompt Builders
// -----------------------------------------------------------------------------
//
// Note: customRules is user-supplied text injected directly into the prompt.
// This is intentionally unsanitized — the app is single-user (local Tauri desktop),
// so the only person affected by prompt injection is the user themselves.
// If this ever becomes a multi-user server, customRules must be sanitized before
// being included in any LLM prompt.

func buildSemanticCodePrompt(question, expected, user, customRules string) string {
	baseRules := `SEMANTIC GRADING RULES:
- Compare structure and logic, not exact variable names.
- The code must be syntactically valid and achieve the same result.
- If a key element is partially correct (right idea, small typo), mark it COVERED.
- If a key element is completely wrong or missing, mark it MISSED.
- Do NOT check for imports unless they are critical to the logic.`

	rules := baseRules
	if customRules != "" {
		rules = baseRules + "\n\nADDITIONAL RULES (override base rules if conflicting):\n" + customRules
	}

	return fmt.Sprintf(`/no_think
You are grading a coding answer.

%s

QUESTION:
%s

EXPECTED CODE:
%s

USER CODE:
%s

Return ONLY valid JSON. Items in "covered" and "missed" must be SHORT labels (the key point itself, ≤5 words). No sentences, no explanations.
{"score": <0-100>, "covered": ["label", ...], "missed": ["label", ...]}`,
		rules, question, expected, user)
}

func buildTheoryPrompt(question, expectedAnswer, userAnswer, customRules string) string {
	baseRules := `RULES:
- Same meaning with different wording = COVERED.
- Missing or incorrect concept = MISSED.`

	rules := baseRules
	if customRules != "" {
		rules = baseRules + "\n\nADDITIONAL RULES (override base rules if conflicting):\n" + customRules
	}

	keyPoints := splitKeyPoints(expectedAnswer)
	pointCount := strings.Count(strings.TrimSpace(keyPoints), "\n") + 1
	if strings.TrimSpace(keyPoints) == "" {
		pointCount = 0
	}

	// Prose expected answer (single line, no list structure): let the LLM extract
	// key concepts itself instead of treating the whole paragraph as one point.
	if pointCount <= 1 {
		return fmt.Sprintf(`/no_think
Grade the answer.

%s

QUESTION:
%s

EXPECTED ANSWER:
%s

USER ANSWER:
%s

First, silently identify the distinct key concepts in the expected answer. Then check which ones the user covered or missed.
Return ONLY valid JSON. Items in "covered" and "missed" must be SHORT labels (≤5 words). No sentences, no explanations.
{"score": <0-100>, "covered": ["label", ...], "missed": ["label", ...]}`,
			rules, question, expectedAnswer, userAnswer)
	}

	return fmt.Sprintf(`/no_think
Grade the answer.

%s

QUESTION:
%s

KEY POINTS:
%s

USER ANSWER:
%s

Return ONLY valid JSON. Items in "covered" and "missed" must be SHORT labels (the key point itself, ≤5 words). No sentences, no explanations.
{"score": <0-100>, "covered": ["label", ...], "missed": ["label", ...]}`,
		rules, question, keyPoints, userAnswer)
}

func buildCLIPrompt(question, expectedAnswer, userAnswer, customRules string) string {
	baseRules := `BASE RULES:
- Break the expected command into logical requirements (e.g. "correct tool", "correct subcommand", "container name arg", "required flag -f").
- Check each requirement against the user command.
- Correct tool + subcommand = COVERED. Wrong or missing = MISSED.
- Required arguments present = COVERED. Missing = MISSED.
- Flag order is irrelevant. Extra harmless flags = still COVERED.
- Completely unrelated command = all requirements MISSED, score 0.`

	rules := baseRules
	if customRules != "" {
		rules = baseRules + "\n\nADDITIONAL RULES (override base rules if conflicting):\n" + customRules
	}

	return fmt.Sprintf(`/no_think
You are a strict CLI command grader. Identify the logical requirements of the expected command, then check each one against the user's command.

%s

QUESTION:
%s

EXPECTED COMMAND:
%s

USER COMMAND:
%s

Return ONLY valid JSON. Each item in "covered"/"missed" is a brief requirement phrase (e.g. "correct tool", "container name arg", "missing -d flag") — not a token, not a sentence.
{"score": <0-100>, "covered": ["requirement phrase", ...], "missed": ["requirement phrase", ...]}`,
		rules, question, expectedAnswer, userAnswer)
}

// -----------------------------------------------------------------------------
// Helpers (unchanged)
// -----------------------------------------------------------------------------

func splitKeyPoints(text string) string {
	lines := strings.Split(strings.TrimSpace(text), "\n")

	var points []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		trimmed = strings.TrimLeft(trimmed, "•·")
		trimmed = strings.TrimSpace(trimmed)
		if strings.HasPrefix(trimmed, "- ") {
			trimmed = strings.TrimSpace(trimmed[2:])
		}
		if strings.HasPrefix(trimmed, "* ") {
			trimmed = strings.TrimSpace(trimmed[2:])
		}
		trimmed = stripNumberedPrefix(trimmed)

		if trimmed != "" {
			points = append(points, trimmed)
		}
	}

	var b strings.Builder
	for i, p := range points {
		fmt.Fprintf(&b, "%d. %s\n", i+1, p)
	}
	return b.String()
}

func stripNumberedPrefix(s string) string {
	runes := []rune(s)
	if len(runes) < 3 || !unicode.IsDigit(runes[0]) {
		return s
	}

	for i, r := range runes {
		if r == '.' || r == ')' {
			if i+1 < len(runes) && runes[i+1] == ' ' {
				return strings.TrimSpace(string(runes[i+2:]))
			}
			break
		}
		if !unicode.IsDigit(r) {
			break
		}
	}
	return s
}

// -----------------------------------------------------------------------------
// Question Generation
// -----------------------------------------------------------------------------

// GenerateRequest contains the parameters for question generation.
type GenerateRequest struct {
	Content   string
	BankType  string  // "theory" | "code" | "cli"
	Language  *string // only when BankType == "code"
	Count     int     // 1-20
	Direction string  // optional user instructions for question style/focus
}

// GeneratedQuestion represents a single generated question.
type GeneratedQuestion struct {
	Subject        string  `json:"subject"`
	ExpectedAnswer string  `json:"expected_answer"`
	GradingPrompt  *string `json:"grading_prompt,omitempty"`
}

// GenerateQuestions generates flashcard questions from study content.
func (g *OllamaGrader) GenerateQuestions(ctx context.Context, req GenerateRequest) ([]GeneratedQuestion, error) {
	prompt := buildGenerationPrompt(req)

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err := g.callLLM(ctx, prompt)
		if err != nil {
			lastErr = err
			continue
		}

		jsonStr := extractJSON(result)
		if jsonStr == "" {
			lastErr = &GradeError{Reason: "no JSON object found in LLM response"}
			continue
		}

		var response struct {
			Questions []GeneratedQuestion `json:"questions"`
		}
		if err := json.Unmarshal([]byte(jsonStr), &response); err != nil {
			lastErr = &GradeError{Reason: "invalid JSON from LLM", Wrapped: err}
			continue
		}

		if len(response.Questions) == 0 {
			lastErr = &GradeError{Reason: "LLM returned no questions"}
			continue
		}

		return response.Questions, nil
	}

	return nil, &GradeError{
		Reason:  fmt.Sprintf("failed after %d attempts", maxRetries),
		Wrapped: lastErr,
	}
}

func buildGenerationPrompt(req GenerateRequest) string {
	bankTypeDesc := "THEORY (key concepts as bullet points)"
	answerFormat := "expected_answer is bullet-point key concepts (one per line, prefix with \"- \")"

	switch req.BankType {
	case "code":
		lang := "the appropriate language"
		if req.Language != nil && *req.Language != "" {
			lang = *req.Language
		}
		bankTypeDesc = fmt.Sprintf("CODE (language: %s)", lang)
		answerFormat = fmt.Sprintf("expected_answer is a complete, runnable code snippet in %s", lang)
	case "cli":
		bankTypeDesc = "CLI (terminal commands)"
		answerFormat = "expected_answer is the exact terminal command"
	}

	directionBlock := ""
	if req.Direction != "" {
		directionBlock = fmt.Sprintf("\nADDITIONAL INSTRUCTIONS:\n%s\n", req.Direction)
	}

	return fmt.Sprintf(`/no_think
You are creating flashcard questions for a student studying the material below.

BANK TYPE: %s

RULES:
- Generate exactly %d question/answer pairs.
- Each question must be directly answerable from the material.
- For this bank type: %s
- grading_prompt: provide a short custom rule ONLY if the default grading rules would be misleading; otherwise set it to null.
- Questions should test understanding, not just recall.
- Vary question difficulty and style.
%s
MATERIAL:
%s

Return ONLY valid JSON, no markdown fences:
{"questions": [{"subject": "question text here", "expected_answer": "answer here", "grading_prompt": null}, ...]}`,
		bankTypeDesc, req.Count, answerFormat, directionBlock, req.Content)
}
