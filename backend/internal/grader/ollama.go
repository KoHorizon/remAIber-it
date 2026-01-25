package grader

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func getLLMURL() string {
	url := os.Getenv("LLM_URL")
	if url == "" {
		return "http://localhost:1234"
	}
	return url
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

// GradeAnswer asks the LLM to identify covered/missed facts, then calculates score server-side
func GradeAnswer(question, expectedAnswer, userAnswer string) (string, error) {
	prompt := fmt.Sprintf(`You are grading a recall exercise. The user must demonstrate they remember the correct information.

QUESTION:
%s

EXPECTED ANSWER:
%s

USER'S ANSWER:
%s

GRADING RULES:

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
   - If user says "pilotage insuffisant" without details, they get 1/4 points for that section

OUTPUT FORMAT:
- "covered": list key concepts the user got right (short phrases, 2-5 words each)
- "missed": list key concepts the user missed (short phrases, 2-5 words each)
- Do NOT copy the expected answer verbatim
- Summarize each point concisely

Example output format:
{"score": 50, "covered": ["périmètre SMSI flou", "analyse de risques"], "missed": ["pilotage insuffisant", "cycle d'amélioration", "revues de direction"]}

Respond with valid JSON only:
{"score": <0-100>, "covered": [...], "missed": [...]}`,
		question, expectedAnswer, userAnswer)

	reqBody := LLMRequest{
		Model: "qwen3-4b-2507",
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

	// Parse the LLM response to extract covered/missed
	var gradeResult GradeResult
	if err := json.Unmarshal([]byte(rawContent), &gradeResult); err != nil {
		// If parsing fails, return raw content and let caller handle it
		return rawContent, nil
	}

	// Calculate score server-side: covered / (covered + missed) * 100
	total := len(gradeResult.Covered) + len(gradeResult.Missed)
	score := 0
	if total > 0 {
		score = (len(gradeResult.Covered) * 100) / total
	}

	// Return final result with calculated score
	finalResult := map[string]interface{}{
		"score":   score,
		"covered": gradeResult.Covered,
		"missed":  gradeResult.Missed,
	}

	resultJSON, _ := json.Marshal(finalResult)
	return string(resultJSON), nil
}
