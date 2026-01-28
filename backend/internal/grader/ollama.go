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

// DefaultGradingRules for theory/recall exercises
const DefaultGradingRules = `GRADING RULES:
1. WRONG FACTS = 0% for that fact
2. AMBIGUOUS ANSWERS = treat as wrong unless they clearly match
3. CORRECT FACTS with different phrasing = 100% for that fact
4. MISSING FACTS = deduct proportionally
5. COUNT ALL DISTINCT POINTS in expected answer`

// GradeAnswer asks the LLM to identify covered/missed facts, then calculates score server-side
func GradeAnswer(question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (string, error) {
	gradingRules := DefaultGradingRules
	if customPrompt != nil && *customPrompt != "" {
		gradingRules = *customPrompt
	}

	var exerciseContext string
	switch bankType {
	case "code":
		exerciseContext = `You are a Logic Auditor. Your ONLY goal is to verify that every logical action in the Expected Answer has a functional equivalent in the User Answer.

STRICT MAPPING RULES:
1. FUNCTIONAL EQUIVALENCE: If the Expected code opens a resource, wraps an error, or cleans up, the User code must do the same. The "How" (syntax) and "Wording" (strings) DO NOT MATTER.
2. THE STRING IGNORE RULE: Never penalize for different error message text or variable names. If you see "%w" or a wrapping pattern, it is CORRECT regardless of the text.
3. CLOSURE EQUIVALENCE: A "defer f.Close()" and a "defer func() { f.Close() }() " are 100% IDENTICAL for grading.
4. MAPPING PROCESS: 
   - Step A: List logical actions in Expected. 
   - Step B: Find them in User. 
   - Step C: If found, it is COVERED. Only mark MISSED if the logic is totally absent.
5. NO PEDANTRY: Do not deduct points for "idioms" if the logic is sound and would compile.`

	case "cli":
		exerciseContext = `You are grading a CLI/COMMAND exercise. The user must write actual terminal commands.
- If the answer is natural language describing commands, give 0%.
- Only actual command syntax counts.`

	default:
		exerciseContext = `You are grading a recall exercise. The user must demonstrate they remember the correct information.`
	}

	prompt := fmt.Sprintf(`%s /no_think

GRADING RULES:
%s

QUESTION:
%s

EXPECTED ANSWER:
%s

USER'S ANSWER:
%s

GRADING INSTRUCTIONS:
1. Compare USER'S ANSWER against EXPECTED ANSWER logical steps.
2. Identify which LOGICAL OPERATIONS from the expected answer are present.
3. A concept is "covered" if the user implemented the same logic, even with different names.
4. A concept is "missed" if a logical step present in the Expected Answer is absent in the User Answer.
5. Provide the output as a JSON object only.

OUTPUT FORMAT:
{"covered": ["list of logical steps found"], "missed": ["list of logical steps absent"]}`,
		exerciseContext, gradingRules, question, expectedAnswer, userAnswer)

	reqBody := LLMRequest{
		Model:       getLLMModel(),
		Messages:    []Message{{Role: "user", Content: prompt}},
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

	cleanContent := extractJSON(llmResp.Choices[0].Message.Content)

	var gradeResult GradeResult
	if err := json.Unmarshal([]byte(cleanContent), &gradeResult); err != nil {
		return cleanContent, nil
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
