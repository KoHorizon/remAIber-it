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

const DefaultGradingRules = `GRADING RULES:
1. WRONG FACTS = 0% for that fact
2. AMBIGUOUS ANSWERS = treat as wrong unless they clearly match
3. CORRECT FACTS with different phrasing = 100% for that fact`

func GradeAnswer(question, expectedAnswer, userAnswer string, customPrompt *string, bankType string) (string, error) {
	gradingRules := DefaultGradingRules
	if customPrompt != nil && *customPrompt != "" {
		gradingRules = *customPrompt
	}

	var exerciseContext string
	switch bankType {
	case "code":
		exerciseContext = `You are a Strict Code Auditor. Your goal is to verify logical checkpoints while ensuring code integrity.

STRICT INTERNAL CONSISTENCY RULES:
1. VARIABLE NAMES: While names can differ from the EXPECTED answer, they MUST be consistent within the USER'S answer.
   - Example: If the user names a parameter 'job' but tries to use 'jobs' in a loop, this is a CRITICAL SYNTAX ERROR.
   - Do not mark as "covered" if the code uses undefined variables or has scope errors.
2. COMPILE CHECK: Mentally 'dry-run' the user's code. If it would fail to compile due to a typo or undefined variable, it is NOT covered.
3. LOGIC OVER NAMING: Focus on the pattern (e.g., closing a channel, using a WaitGroup) rather than the specific name used in the expected answer.
4. NO ASSUMPTIONS: Do not "fix" the user's typos in your mind. Grade exactly what is written.`

	case "cli":
		exerciseContext = `You are grading a CLI exercise. User must write terminal commands.`

	default:
		exerciseContext = `You are grading a recall exercise.`
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

INSTRUCTIONS:
1. Identify logical checkpoints (e.g., channel iteration, waitgroup signaling).
2. Check for internal variable consistency. If a user uses 'job' then 'jobs', mark the step as MISSED.
3. Respond in valid JSON format only.

OUTPUT FORMAT:
{"covered": [...], "missed": ["Reason for failure if code is inconsistent"]}`,
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
