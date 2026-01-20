// internal/llm-grader/grader.go
package ollama

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

type OllamaResponse struct {
	QuestionID string
	Response   string
	Err        error
}

type LLMResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func GradeAnswer(question, expectedAnswer, userAnswer string) (string, error) {
	prompt := fmt.Sprintf(`You are a strict but fair grader. Compare the user's answer against the expected answer.

QUESTION:
%s

EXPECTED ANSWER:
%s

USER'S ANSWER:
%s

GRADING INSTRUCTIONS:
1. Extract the key concepts from the expected answer
2. Check which concepts appear in the user's answer (exact wording not required, understanding matters)
3. Calculate score: (concepts covered / total concepts) * 100, rounded to nearest integer
4. Be lenient with phrasing but strict on meaning

Respond with valid JSON only, no other text:
{"score": <0-100>, "covered": ["concept1", "concept2"], "missed": ["concept3"]}`,
		question, expectedAnswer, userAnswer)

	reqBody := LLMRequest{
		Model: "qwen3-4b-2507",
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		Temperature: 42,
	}

	jsonData, _ := json.Marshal(reqBody)
	resp, err := http.Post(getLLMURL()+"/v1/chat/completions", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result LLMResponse
	json.NewDecoder(resp.Body).Decode(&result)

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from LLM")
	}

	return result.Choices[0].Message.Content, nil
}
