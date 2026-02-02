package grader

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

func getLLMURL() string {
	url := os.Getenv("LLM_URL")
	if url == "" {
		return "http://localhost:1234"
	}
	return url
}

func getLLMModel() string {
	model := os.Getenv("LLM_MODEL")
	if model == "" {
		return "qwen3-8b"
	}
	return model
}

// extractJSON finds the outermost JSON object in a string.
// It handles nested braces correctly and skips braces inside quoted strings.
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

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LLMRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
}

type LLMResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type GradeResult struct {
	Score   int      `json:"score"`
	Covered []string `json:"covered"`
	Missed  []string `json:"missed"`
}

// GradeError is returned when grading fails so the caller can distinguish
// between "LLM returned a bad grade" and "LLM was unreachable."
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

func (e *GradeError) Unwrap() error {
	return e.Wrapped
}

// ============================================================================
// Prompt builders — kept short and directive for small (4-8B) models.
//
// Design principles:
//   - Pre-split the expected answer into key points on the Go side when possible
//     to reduce the cognitive load on the model.
//   - Ask for a simple classification task (COVERED / MISSED) rather than
//     open-ended semantic analysis.
//   - Always end with the JSON schema so it's the last thing the model sees.
//   - Use /no_think where supported to suppress chain-of-thought tokens.
// ============================================================================

// buildTheoryPrompt creates a grading prompt for theory/concept questions.
func buildTheoryPrompt(question, expectedAnswer, userAnswer, customRules string) string {
	keyPoints := splitKeyPoints(expectedAnswer)

	rules := `RULES:
- A key point is COVERED if the user expressed the same idea, even with different wording or synonyms.
- A key point is MISSED if the user did not mention it or got it wrong.
- Only use strings from the KEY POINTS list in your output.`

	if customRules != "" {
		rules = customRules
	}

	return fmt.Sprintf(`/no_think
You are grading a study exercise. Classify each key point as COVERED or MISSED.

%s

QUESTION:
%s

KEY POINTS (from expected answer):
%s

USER'S ANSWER:
%s

Respond with ONLY this JSON — no explanation, no markdown:
{"covered": ["point text", ...], "missed": ["point text", ...]}`,
		rules, question, keyPoints, userAnswer)
}

// buildCodePrompt creates a grading prompt for code questions.
func buildCodePrompt(question, expectedAnswer, userAnswer, customRules string) string {
	rules := `RULES:
- Compare structure and logic, not exact variable names.
- The code must be syntactically valid and achieve the same result.
- If a key element is partially correct (right idea, small typo), mark it COVERED.
- If a key element is completely wrong or missing, mark it MISSED.
- Do NOT check for imports unless they are critical to the logic.`

	if customRules != "" {
		rules = customRules
	}

	keyElements := splitKeyPoints(expectedAnswer)

	return fmt.Sprintf(`/no_think
You are grading a code exercise. Compare the user's code against the expected answer.

%s

QUESTION:
%s

EXPECTED CODE ELEMENTS:
%s

USER'S CODE:
%s

Respond with ONLY this JSON — no explanation, no markdown:
{"covered": ["element description", ...], "missed": ["element description", ...]}`,
		rules, question, keyElements, userAnswer)
}

// buildCLIPrompt creates a grading prompt for CLI/terminal questions.
func buildCLIPrompt(question, expectedAnswer, userAnswer, customRules string) string {
	rules := `RULES:
- Commands must match in structure: correct binary, subcommand, and required flags.
- Flag ORDER does not matter (e.g. "-a -m" equals "-m -a").
- Typos in command names = MISSED (e.g. "git comit" instead of "git commit").
- Extra harmless flags = still COVERED.
- Missing required flags or arguments = MISSED.`

	if customRules != "" {
		rules = customRules
	}

	// For CLI, each line is typically one command/step
	lines := strings.Split(strings.TrimSpace(expectedAnswer), "\n")
	var points []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			points = append(points, trimmed)
		}
	}

	keyPoints := ""
	for i, p := range points {
		keyPoints += fmt.Sprintf("%d. %s\n", i+1, p)
	}

	return fmt.Sprintf(`/no_think
You are grading a CLI exercise. Check if each expected command was written correctly.

%s

QUESTION:
%s

EXPECTED COMMANDS:
%s

USER'S COMMANDS:
%s

Respond with ONLY this JSON — no explanation, no markdown:
{"covered": ["command or step", ...], "missed": ["command or step", ...]}`,
		rules, question, keyPoints, userAnswer)
}

// splitKeyPoints attempts to break an expected answer into individual points.
// It looks for bullet lists, numbered lists, or sentence boundaries.
// This reduces the work the LLM has to do — instead of analyzing a blob of text,
// it gets a pre-structured list to classify.
func splitKeyPoints(text string) string {
	lines := strings.Split(strings.TrimSpace(text), "\n")

	var points []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		// Strip common list prefixes
		trimmed = strings.TrimLeft(trimmed, "•·")
		trimmed = strings.TrimSpace(trimmed)
		if len(trimmed) > 2 && trimmed[0] == '-' && trimmed[1] == ' ' {
			trimmed = strings.TrimSpace(trimmed[2:])
		}
		if len(trimmed) > 2 && trimmed[0] == '*' && trimmed[1] == ' ' {
			trimmed = strings.TrimSpace(trimmed[2:])
		}
		// Strip numbered prefix like "1. " or "1) "
		if len(trimmed) > 3 && trimmed[0] >= '0' && trimmed[0] <= '9' {
			for i, ch := range trimmed {
				if ch == '.' || ch == ')' {
					if i+1 < len(trimmed) && trimmed[i+1] == ' ' {
						trimmed = strings.TrimSpace(trimmed[i+2:])
					}
					break
				}
				if ch < '0' || ch > '9' {
					break
				}
			}
		}

		if trimmed != "" {
			points = append(points, trimmed)
		}
	}

	// If we only got one big block (no natural list structure), try splitting by sentences
	if len(points) == 1 && len(points[0]) > 120 {
		sentences := splitSentences(points[0])
		if len(sentences) > 1 {
			points = sentences
		}
	}

	result := ""
	for i, p := range points {
		result += fmt.Sprintf("%d. %s\n", i+1, p)
	}
	return result
}

// splitSentences does a basic sentence split on ". " boundaries.
func splitSentences(text string) []string {
	var sentences []string
	current := ""

	for i := 0; i < len(text); i++ {
		current += string(text[i])
		if text[i] == '.' && i+1 < len(text) && text[i+1] == ' ' {
			trimmed := strings.TrimSpace(current)
			if trimmed != "" && len(trimmed) > 10 {
				sentences = append(sentences, trimmed)
			}
			current = ""
		}
	}
	trimmed := strings.TrimSpace(current)
	if trimmed != "" && len(trimmed) > 10 {
		sentences = append(sentences, trimmed)
	}
	return sentences
}

// ============================================================================
// Core grading function
// ============================================================================

const maxRetries = 2

// GradeAnswer sends the user's answer to the LLM for grading and returns
// the result as a JSON string with {score, covered, missed}.
//
// It retries once on parse failure (small models sometimes need a second try).
func GradeAnswer(question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (string, error) {
	customRules := ""
	if customPrompt != nil && *customPrompt != "" {
		customRules = *customPrompt
	}

	// Build the appropriate prompt
	var prompt string
	switch bankType {
	case "code":
		prompt = buildCodePrompt(question, expectedAnswer, userAnswer, customRules)
	case "cli":
		prompt = buildCLIPrompt(question, expectedAnswer, userAnswer, customRules)
	default:
		prompt = buildTheoryPrompt(question, expectedAnswer, userAnswer, customRules)
	}

	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err := callLLM(prompt)
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

		// Validate: at least one of covered/missed should have items,
		// unless the expected answer was trivially empty
		if len(gradeResult.Covered) == 0 && len(gradeResult.Missed) == 0 {
			// Treat as "model couldn't grade" — give benefit of the doubt
			gradeResult.Missed = []string{"Unable to evaluate"}
		}

		// Compute score
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

// callLLM sends a single request to the LLM and returns the raw text response.
func callLLM(prompt string) (string, error) {
	reqBody := LLMRequest{
		Model: getLLMModel(),
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		Temperature: 0,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	client := &http.Client{
		Timeout: 120 * time.Second,
	}

	resp, err := client.Post(
		getLLMURL()+"/v1/chat/completions",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return "", fmt.Errorf("LLM request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LLM returned status %d", resp.StatusCode)
	}

	var llmResp LLMResponse
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
