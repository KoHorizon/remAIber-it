// FIXED LLM GRADER — semantic code grading
// ------------------------------------------------------------
// Key fixes applied:
// 1. Code questions are no longer split into line-by-line key points.
// 2. Prompt enforces SEMANTIC equivalence instead of structural matching.
// 3. Stronger JSON‑only response enforcement for small models.
// 4. Bias toward COVERED when behavior is equivalent.
// ------------------------------------------------------------

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
	if customPrompt != nil && *customPrompt != "" {
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

		total := len(gradeResult.Covered) + len(gradeResult.Missed)
		score := 0
		if total > 0 {
			score = (len(gradeResult.Covered) * 100) / total
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

// *** NEW: semantic code grading ***
func buildSemanticCodePrompt(question, expected, user, customRules string) string {
	rules := `SEMANTIC GRADING RULES:
- Compare structure and logic, not exact variable names.
- The code must be syntactically valid and achieve the same result.
- If a key element is partially correct (right idea, small typo), mark it COVERED.
- If a key element is completely wrong or missing, mark it MISSED.
- Do NOT check for imports unless they are critical to the logic.`

	if customRules != "" {
		rules = customRules
	}

	return fmt.Sprintf(`/no_think
You are grading a coding syntax,

%s

QUESTION:
%s

EXPECTED CODE:
%s

USER CODE:
%s

Return ONLY valid JSON:
{"covered": ["logical element", ...], "missed": ["logical element", ...]}`,
		rules, question, expected, user)
}

// Theory + CLI prompts reused from original (unchanged semantics)

func buildTheoryPrompt(question, expectedAnswer, userAnswer, customRules string) string {
	keyPoints := splitKeyPoints(expectedAnswer)

	rules := `RULES:
- Same meaning with different wording = COVERED.
- Missing or incorrect concept = MISSED.`

	if customRules != "" {
		rules = customRules
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

Return ONLY JSON:
{"covered": [...], "missed": [...]}`,
		rules, question, keyPoints, userAnswer)
}

// Previous prompt :
// - Commands must match in structure: correct binary, subcommand, and required flags.
// - Flag ORDER does not matter (e.g. "-a -m" equals "-m -a").
// - Typos in command names = MISSED (e.g. "git comit" instead of "git commit").
// - Extra harmless flags = still COVERED.
// - Missing required flags or arguments = MISSED.`
func buildCLIPrompt(question, expectedAnswer, userAnswer, customRules string) string {
	rules := `RULES:
- Correct command structure required.
- Flag order irrelevant.
- Missing required flags = MISSED.`

	if customRules != "" {
		rules = customRules
	}

	return fmt.Sprintf(`/no_think
Grade the CLI answer.

%s

QUESTION:
%s

EXPECTED:
%s

USER:
%s

Return ONLY JSON:
{"covered": [...], "missed": [...]}`,
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
