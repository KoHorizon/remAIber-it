package grader

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
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

// extractJSON finds and returns the JSON object from a string
func extractJSON(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start != -1 && end != -1 && end > start {
		return s[start : end+1]
	}
	return s
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
	Covered []string `json:"covered"`
	Missed  []string `json:"missed"`
}

// DefaultGradingRules is the default grading prompt for concept-based recall
const DefaultGradingRules = `GRADING RULES:

1. WRONG FACTS = 0%% for that fact
   - Wrong dates, numbers, names, or values are incorrect, not "close enough"
   - "sept 2024" when expected "sept 2025" = WRONG (different year)

2. AMBIGUOUS ANSWERS = treat as wrong unless they clearly match
   - "09/26" is ambiguous (Sept 2026? Sept 26th?)
   - When in doubt, the answer is wrong

3. CORRECT FACTS with different phrasing = 100%% for that fact
   - "sept 2025" = "Septembre 2025" = "09/2025" (same fact, full credit)
   - "never" = "jamais" (same meaning, full credit)

4. MISSING FACTS = deduct proportionally
   - If expected answer lists 6 items and user gives 3, score is ~50%%
   - Each distinct concept/item in expected answer counts equally
   - Partial lists get partial credit, not full credit

5. COUNT ALL DISTINCT POINTS in expected answer
   - Main categories AND their sub-items count separately
   - Example: "pilotage insuffisant (objectifs, indicateurs, revues)" = 4 points
   - If user says "pilotage insuffisant" without details, they get 1/4 points for that section`

// GradeAnswer asks the LLM to identify covered/missed facts, then calculates score server-side
// If customPrompt is provided and not empty, it replaces the default grading rules
// bankType can be "theory", "code", or "cli" - used for pre-validation
func GradeAnswer(question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (string, error) {
	gradingRules := DefaultGradingRules
	if customPrompt != nil && *customPrompt != "" {
		gradingRules = *customPrompt
	}

	// Build context based on bank type
	var exerciseContext string
	switch bankType {
	case "code":
		exerciseContext = `You are grading a CODE SYNTAX exercise. The user must write actual working code.

CRITICAL: The user's answer MUST be actual code, not a description of code.
- If the answer is written in natural language (English sentences describing code), give 0% - put everything in "missed"
- "As you can see this is a func..." is NOT code, it's a description = 0%
- Only actual code syntax like "func NewUser(email string)" counts as a valid attempt
- Mentioning programming terms in English does NOT count as writing code`
	case "cli":
		exerciseContext = `You are grading a CLI/COMMAND exercise. The user must write actual terminal commands.

CRITICAL: The user's answer MUST be actual commands, not a description.
- If the answer is written in natural language describing commands, give 0% - put everything in "missed"
- "You would use the git command to..." is NOT a command = 0%
- Only actual commands like "git commit -m 'message'" count as valid attempts`
	default:
		exerciseContext = `You are grading a recall exercise. The user must demonstrate they remember the correct information.`
	}

	prompt := fmt.Sprintf(`%s /no_think

QUESTION:
%s

EXPECTED ANSWER:
%s

USER'S ANSWER:
%s

%s

OUTPUT FORMAT:
- "covered": list key concepts the user got right (short phrases, 2-5 words each)
- "missed": list key concepts the user missed (short phrases, 2-5 words each)
- Do NOT copy the expected answer verbatim
- Summarize each point concisely
- For code/cli: if the answer is natural language instead of code, put EVERYTHING in "missed"

Example output format:
{"covered": ["concept1", "concept2"], "missed": ["concept3", "concept4"]}

Respond with valid JSON only:
{"covered": [...], "missed": [...]}`,
		exerciseContext, question, expectedAnswer, userAnswer, gradingRules)

	reqBody := LLMRequest{
		Model: getLLMModel(),
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		Temperature: 0,
	}

	jsonData, _ := json.Marshal(reqBody)
	resp, err := http.Post(getLLMURL()+"/v1/chat/completions", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var llmResp LLMResponse
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		return "", err
	}

	if len(llmResp.Choices) == 0 {
		return "", fmt.Errorf("no response from LLM")
	}

	rawContent := llmResp.Choices[0].Message.Content

	// Extract JSON from response (handles <think> tags, etc.)
	cleanContent := extractJSON(rawContent)

	// Parse the LLM response to extract covered/missed
	var gradeResult GradeResult
	if err := json.Unmarshal([]byte(cleanContent), &gradeResult); err != nil {
		// If parsing fails, return raw content and let caller handle it
		return rawContent, nil
	}

	// Calculate score server-side: covered / (covered + missed) * 100
	total := len(gradeResult.Covered) + len(gradeResult.Missed)
	score := 0
	if total > 0 {
		score = (len(gradeResult.Covered) * 100) / total
	}

	// Return final result
	finalResult := map[string]interface{}{
		"score":   score,
		"covered": gradeResult.Covered,
		"missed":  gradeResult.Missed,
	}

	resultJSON, _ := json.Marshal(finalResult)
	return string(resultJSON), nil
}
