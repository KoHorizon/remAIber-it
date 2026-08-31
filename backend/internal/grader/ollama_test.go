package grader

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

func strPtr(s string) *string { return &s }

func assertContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if !strings.Contains(haystack, needle) {
		t.Errorf("expected prompt to contain %q, but it did not.\nprompt:\n%s", needle, haystack)
	}
}

func assertNotContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if strings.Contains(haystack, needle) {
		t.Errorf("expected prompt NOT to contain %q, but it did.\nprompt:\n%s", needle, haystack)
	}
}

// sliceEqual compares string slices by content, treating nil and empty
// slices as equivalent (filterEmpty's nil-vs-empty behaviour is an
// implementation detail we don't want to pin down in every test).
func sliceEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// newFixedServer stands up an OpenAI-compatible /v1/chat/completions endpoint
// that always returns the given content string as the assistant message.
func newFixedServer(t *testing.T, content string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]interface{}{
			"choices": []map[string]interface{}{
				{"message": map[string]interface{}{"content": content}},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
}

// -----------------------------------------------------------------------------
// extractJSON
// -----------------------------------------------------------------------------

func TestExtractJSON(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "plain JSON object",
			in:   `{"a":1}`,
			want: `{"a":1}`,
		},
		{
			name: "JSON wrapped in markdown fences",
			in:   "```json\n{\"a\":1}\n```",
			want: `{"a":1}`,
		},
		{
			name: "JSON preceded by reasoning preamble",
			in:   `Let me think about this. I believe the answer is {"a":1} based on the rules.`,
			want: `{"a":1}`,
		},
		{
			name: "JSON followed by trailing prose",
			in:   `{"a":1} — that's my final answer.`,
			want: `{"a":1}`,
		},
		{
			name: "nested objects",
			in:   `{"a":{"b":1,"c":{"d":2}}}`,
			want: `{"a":{"b":1,"c":{"d":2}}}`,
		},
		{
			name: "braces inside string literal do not confuse depth counter",
			in:   `{"covered":["use {} literal"]}`,
			want: `{"covered":["use {} literal"]}`,
		},
		{
			name: "brace-heavy string literal with unbalanced braces inside string",
			in:   `{"a":"{{{ not real json }"}`,
			want: `{"a":"{{{ not real json }"}`,
		},
		{
			name: "backslash-escaped quotes inside strings",
			in:   `{"a":"say \"hi\""}`,
			want: `{"a":"say \"hi\""}`,
		},
		{
			name: "unbalanced/truncated input",
			in:   `{"a":1, "b": [1,2,3]`,
			want: "",
		},
		{
			name: "empty string",
			in:   "",
			want: "",
		},
		{
			name: "input with no JSON at all",
			in:   "there is nothing but plain prose here, no braces whatsoever",
			want: "",
		},
		{
			name: "preamble plus fenced JSON plus trailing prose",
			in:   "Sure thing!\n```json\n{\"score\":80,\"covered\":[\"a\"],\"missed\":[]}\n```\nHope that helps.",
			want: `{"score":80,"covered":["a"],"missed":[]}`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractJSON(tc.in)
			if got != tc.want {
				t.Errorf("extractJSON(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

// -----------------------------------------------------------------------------
// filterEmpty
// -----------------------------------------------------------------------------

func TestFilterEmpty(t *testing.T) {
	tests := []struct {
		name string
		in   []string
		want []string
	}{
		{"no blanks", []string{"a", "b"}, []string{"a", "b"}},
		{"blank entries stripped", []string{"a", "", "  ", "b", "\t"}, []string{"a", "b"}},
		{"all blank", []string{"", "  ", "\t\n"}, []string{}},
		{"nil input", nil, []string{}},
		{"empty slice", []string{}, []string{}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := filterEmpty(tc.in)
			if !sliceEqual(got, tc.want) {
				t.Errorf("filterEmpty(%v) = %v, want %v", tc.in, got, tc.want)
			}
		})
	}
}

// -----------------------------------------------------------------------------
// splitKeyPoints
// -----------------------------------------------------------------------------

func TestSplitKeyPoints(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "dash bulleted",
			in:   "- point one\n- point two",
			want: "1. point one\n2. point two\n",
		},
		{
			name: "star bulleted",
			in:   "* alpha\n* beta",
			want: "1. alpha\n2. beta\n",
		},
		{
			name: "bullet char prefix",
			in:   "• first\n• second",
			want: "1. first\n2. second\n",
		},
		{
			name: "numbered with dot",
			in:   "1. point one\n2. point two",
			want: "1. point one\n2. point two\n",
		},
		{
			name: "numbered with paren",
			in:   "1) point one\n2) point two",
			want: "1. point one\n2. point two\n",
		},
		{
			name: "single prose expected answer",
			in:   "Just one sentence with no list structure.",
			want: "1. Just one sentence with no list structure.\n",
		},
		{
			name: "blank lines are skipped",
			in:   "- a\n\n- b\n\n",
			want: "1. a\n2. b\n",
		},
		{
			name: "empty input",
			in:   "",
			want: "",
		},
		{
			name: "whitespace-only input",
			in:   "   \n  \n",
			want: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := splitKeyPoints(tc.in)
			if got != tc.want {
				t.Errorf("splitKeyPoints(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

// -----------------------------------------------------------------------------
// Prompt builders
// -----------------------------------------------------------------------------

func TestBuildTheoryPrompt(t *testing.T) {
	t.Run("single prose expected answer, no custom rules", func(t *testing.T) {
		p := buildTheoryPrompt("What is Go?", "A compiled, statically typed language.", "It is compiled and statically typed.", "")
		assertContains(t, p, "What is Go?")
		assertContains(t, p, "A compiled, statically typed language.")
		assertContains(t, p, "It is compiled and statically typed.")
		assertContains(t, p, "EXPECTED ANSWER")
		assertContains(t, p, "Return ONLY valid JSON")
		assertNotContains(t, p, "ADDITIONAL RULES")
		assertNotContains(t, p, "KEY POINTS")
	})

	t.Run("multi key-point expected answer with custom rules", func(t *testing.T) {
		p := buildTheoryPrompt("Explain OOP.", "- Encapsulation\n- Inheritance\n- Polymorphism", "abc", "Be lenient about wording.")
		assertContains(t, p, "Explain OOP.")
		assertContains(t, p, "abc")
		assertContains(t, p, "KEY POINTS")
		assertContains(t, p, "1. Encapsulation")
		assertContains(t, p, "2. Inheritance")
		assertContains(t, p, "3. Polymorphism")
		assertContains(t, p, "ADDITIONAL RULES")
		assertContains(t, p, "Be lenient about wording.")
		assertContains(t, p, "Return ONLY valid JSON")
		assertNotContains(t, p, "EXPECTED ANSWER (the ONLY ground truth)")
	})
}

func TestBuildSemanticCodePrompt(t *testing.T) {
	t.Run("no custom rules", func(t *testing.T) {
		p := buildSemanticCodePrompt("Write a function that adds two numbers.", "func add(a, b int) int { return a + b }", "func add(a,b int) int { return a+b }", "")
		assertContains(t, p, "Write a function that adds two numbers.")
		assertContains(t, p, "func add(a, b int) int { return a + b }")
		assertContains(t, p, "func add(a,b int) int { return a+b }")
		assertContains(t, p, "QUESTION:")
		assertContains(t, p, "EXPECTED CODE:")
		assertContains(t, p, "USER CODE:")
		assertContains(t, p, "Return ONLY valid JSON")
		assertNotContains(t, p, "ADDITIONAL RULES")
	})

	t.Run("with custom rules", func(t *testing.T) {
		p := buildSemanticCodePrompt("q", "expected", "user", "Ignore whitespace differences entirely.")
		assertContains(t, p, "ADDITIONAL RULES")
		assertContains(t, p, "Ignore whitespace differences entirely.")
		assertContains(t, p, "Return ONLY valid JSON")
	})
}

func TestBuildCLIPrompt(t *testing.T) {
	t.Run("no custom rules", func(t *testing.T) {
		p := buildCLIPrompt("How do you list running containers?", "docker ps -a", "docker ps", "")
		assertContains(t, p, "How do you list running containers?")
		assertContains(t, p, "docker ps -a")
		assertContains(t, p, "docker ps")
		assertContains(t, p, "EXPECTED COMMAND:")
		assertContains(t, p, "USER COMMAND:")
		assertContains(t, p, "Return ONLY valid JSON")
		assertNotContains(t, p, "ADDITIONAL RULES")
	})

	t.Run("with custom rules", func(t *testing.T) {
		p := buildCLIPrompt("q", "expected cmd", "user cmd", "Flags must match exactly.")
		assertContains(t, p, "ADDITIONAL RULES")
		assertContains(t, p, "Flags must match exactly.")
		assertContains(t, p, "Return ONLY valid JSON")
	})
}

// -----------------------------------------------------------------------------
// GradeAnswer: score computation
// -----------------------------------------------------------------------------

type decodedGradeResult struct {
	Score   int      `json:"score"`
	Covered []string `json:"covered"`
	Missed  []string `json:"missed"`
}

func TestGradeAnswer_ScoreComputation(t *testing.T) {
	tests := []struct {
		name         string
		llmContent   string
		customPrompt *string
		wantScore    int
		wantCovered  []string
		wantMissed   []string
	}{
		{
			name:         "no custom rules: LLM score ignored, computed from covered/missed",
			llmContent:   `{"score":999,"covered":["a","b"],"missed":["c"]}`,
			customPrompt: nil,
			wantScore:    66, // 2*100/3 = 66 (integer division)
			wantCovered:  []string{"a", "b"},
			wantMissed:   []string{"c"},
		},
		{
			name:         "custom rules with in-range score: LLM score trusted",
			llmContent:   `{"score":75,"covered":["a"],"missed":["b","c"]}`,
			customPrompt: strPtr("be strict"),
			wantScore:    75,
			wantCovered:  []string{"a"},
			wantMissed:   []string{"b", "c"},
		},
		{
			name:         "custom rules, boundary score 0 is trusted",
			llmContent:   `{"score":0,"covered":["a"],"missed":[]}`,
			customPrompt: strPtr("rule"),
			wantScore:    0,
			wantCovered:  []string{"a"},
			wantMissed:   []string{},
		},
		{
			name:         "custom rules, boundary score 100 is trusted",
			llmContent:   `{"score":100,"covered":["a","b"],"missed":[]}`,
			customPrompt: strPtr("rule"),
			wantScore:    100,
			wantCovered:  []string{"a", "b"},
			wantMissed:   []string{},
		},
		{
			name:         "custom rules, negative out-of-range score falls back to computed",
			llmContent:   `{"score":-5,"covered":["a","b"],"missed":["c","d"]}`,
			customPrompt: strPtr("rule"),
			wantScore:    50, // 2*100/4 = 50
			wantCovered:  []string{"a", "b"},
			wantMissed:   []string{"c", "d"},
		},
		{
			name:         "custom rules, >100 out-of-range score falls back to computed",
			llmContent:   `{"score":150,"covered":["a","b","c"],"missed":["d"]}`,
			customPrompt: strPtr("rule"),
			wantScore:    75, // 3*100/4 = 75
			wantCovered:  []string{"a", "b", "c"},
			wantMissed:   []string{"d"},
		},
		{
			name:         "both covered and missed empty: fallback missed + score 0 (division guard exercised)",
			llmContent:   `{"score":50,"covered":[],"missed":[]}`,
			customPrompt: nil,
			wantScore:    0,
			wantCovered:  []string{},
			wantMissed:   []string{"unable to evaluate"},
		},
		{
			name:         "blank-only entries filtered out, then treated as empty",
			llmContent:   `{"score":50,"covered":["  ",""],"missed":["\t"]}`,
			customPrompt: nil,
			wantScore:    0,
			wantCovered:  []string{},
			wantMissed:   []string{"unable to evaluate"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			server := newFixedServer(t, tc.llmContent)
			defer server.Close()

			g := NewOllamaGrader(server.URL, "test-model")
			resultJSON, err := g.GradeAnswer(context.Background(), "question", "expected", "user answer", tc.customPrompt, "theory")
			if err != nil {
				t.Fatalf("GradeAnswer returned error: %v", err)
			}

			var got decodedGradeResult
			if err := json.Unmarshal([]byte(resultJSON), &got); err != nil {
				t.Fatalf("failed to decode result JSON %q: %v", resultJSON, err)
			}

			if got.Score != tc.wantScore {
				t.Errorf("score = %d, want %d", got.Score, tc.wantScore)
			}
			if !sliceEqual(got.Covered, tc.wantCovered) {
				t.Errorf("covered = %v, want %v", got.Covered, tc.wantCovered)
			}
			if !sliceEqual(got.Missed, tc.wantMissed) {
				t.Errorf("missed = %v, want %v", got.Missed, tc.wantMissed)
			}
		})
	}
}

// TestGradeAnswer_MissingScoreFieldWithCustomRules documents a subtle edge
// case: when custom grading rules are active but the LLM's JSON omits the
// "score" key entirely, Go's json.Unmarshal leaves GradeResult.Score at its
// zero value (0). Since 0 is within the trusted [0,100] range, the code
// trusts that zero-value score rather than falling back to the computed
// score. This is current behaviour, not necessarily intended.
func TestGradeAnswer_MissingScoreFieldWithCustomRules(t *testing.T) {
	llmContent := `{"covered":["a","b"],"missed":["c","d"]}` // no "score" key at all
	server := newFixedServer(t, llmContent)
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	resultJSON, err := g.GradeAnswer(context.Background(), "q", "expected", "user", strPtr("custom rule"), "theory")
	if err != nil {
		t.Fatalf("GradeAnswer returned error: %v", err)
	}

	var got decodedGradeResult
	if err := json.Unmarshal([]byte(resultJSON), &got); err != nil {
		t.Fatalf("failed to decode result JSON %q: %v", resultJSON, err)
	}

	// Current behaviour: absent score defaults to 0, which is in-range and
	// therefore trusted verbatim -- even though covered (2) and missed (2)
	// would otherwise compute to a score of 50.
	if got.Score != 0 {
		t.Errorf("score = %d, want 0 (documenting current zero-value-trusted behaviour)", got.Score)
	}
}

// -----------------------------------------------------------------------------
// GradeAnswer: retry and error behaviour
// -----------------------------------------------------------------------------

func TestGradeAnswer_RetrySucceedsOnSecondAttempt(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&calls, 1)
		if n == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		resp := map[string]interface{}{
			"choices": []map[string]interface{}{
				{"message": map[string]interface{}{"content": `{"score":80,"covered":["a"],"missed":[]}`}},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	resultJSON, err := g.GradeAnswer(context.Background(), "q", "expected", "user", nil, "theory")
	if err != nil {
		t.Fatalf("expected success on retry, got error: %v", err)
	}
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Errorf("expected exactly 2 HTTP calls (1 failure + 1 success), got %d", got)
	}

	var got decodedGradeResult
	if err := json.Unmarshal([]byte(resultJSON), &got); err != nil {
		t.Fatalf("failed to decode result JSON %q: %v", resultJSON, err)
	}
	if got.Score != 100 { // no custom rules: 1 covered, 0 missed -> 1*100/1
		t.Errorf("score = %d, want 100", got.Score)
	}
}

func TestGradeAnswer_GivesUpAfterMaxRetries(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		resp := map[string]interface{}{
			"choices": []map[string]interface{}{
				{"message": map[string]interface{}{"content": "this is not json at all, just rambling prose"}},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	_, err := g.GradeAnswer(context.Background(), "q", "expected", "user", nil, "theory")
	if err == nil {
		t.Fatal("expected an error, got nil")
	}

	var gradeErr *GradeError
	if !errors.As(err, &gradeErr) {
		t.Fatalf("expected error to be *GradeError, got %T: %v", err, err)
	}
	if !strings.Contains(gradeErr.Reason, "failed after 2 attempts") {
		t.Errorf("Reason = %q, want it to contain %q", gradeErr.Reason, "failed after 2 attempts")
	}
	if gradeErr.Wrapped == nil {
		t.Fatal("expected Wrapped error to be set")
	}
	var innerErr *GradeError
	if !errors.As(gradeErr.Wrapped, &innerErr) {
		t.Fatalf("expected Wrapped to be *GradeError, got %T: %v", gradeErr.Wrapped, gradeErr.Wrapped)
	}
	if !strings.Contains(innerErr.Reason, "no JSON object found in LLM response") {
		t.Errorf("inner Reason = %q, want it to contain %q", innerErr.Reason, "no JSON object found in LLM response")
	}

	if got := atomic.LoadInt32(&calls); got != maxRetries {
		t.Errorf("expected exactly %d HTTP calls, got %d", maxRetries, got)
	}
}

func TestGradeAnswer_GivesUpOnPersistentInvalidJSON(t *testing.T) {
	// A JSON object is present (extractJSON succeeds) but does not unmarshal
	// cleanly into GradeResult's expected shape (score is a string, not a
	// number), so json.Unmarshal fails on every attempt.
	server := newFixedServer(t, `{"score":"not-a-number","covered":[],"missed":[]}`)
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	_, err := g.GradeAnswer(context.Background(), "q", "expected", "user", nil, "theory")
	if err == nil {
		t.Fatal("expected an error, got nil")
	}

	var gradeErr *GradeError
	if !errors.As(err, &gradeErr) {
		t.Fatalf("expected error to be *GradeError, got %T: %v", err, err)
	}
	var innerErr *GradeError
	if !errors.As(gradeErr.Wrapped, &innerErr) {
		t.Fatalf("expected Wrapped to be *GradeError, got %T: %v", gradeErr.Wrapped, gradeErr.Wrapped)
	}
	if !strings.Contains(innerErr.Reason, "invalid JSON from LLM") {
		t.Errorf("inner Reason = %q, want it to contain %q", innerErr.Reason, "invalid JSON from LLM")
	}
}

// -----------------------------------------------------------------------------
// GenerateQuestions
// -----------------------------------------------------------------------------

func TestGenerateQuestions_ValidResponse(t *testing.T) {
	content := `{"questions":[{"subject":"Q1","expected_answer":"A1","grading_prompt":null},{"subject":"Q2","expected_answer":"A2"}]}`
	server := newFixedServer(t, content)
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	qs, err := g.GenerateQuestions(context.Background(), GenerateRequest{
		Content:  "some study material",
		BankType: "theory",
		Count:    2,
	})
	if err != nil {
		t.Fatalf("GenerateQuestions returned error: %v", err)
	}
	if len(qs) != 2 {
		t.Fatalf("len(qs) = %d, want 2", len(qs))
	}
	if qs[0].Subject != "Q1" || qs[0].ExpectedAnswer != "A1" {
		t.Errorf("qs[0] = %+v, want Subject=Q1 ExpectedAnswer=A1", qs[0])
	}
	if qs[0].GradingPrompt != nil {
		t.Errorf("qs[0].GradingPrompt = %v, want nil", *qs[0].GradingPrompt)
	}
	if qs[1].Subject != "Q2" || qs[1].ExpectedAnswer != "A2" {
		t.Errorf("qs[1] = %+v, want Subject=Q2 ExpectedAnswer=A2", qs[1])
	}
}

func TestGenerateQuestions_ZeroQuestionsErrors(t *testing.T) {
	content := `{"questions":[]}`
	server := newFixedServer(t, content)
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	_, err := g.GenerateQuestions(context.Background(), GenerateRequest{
		Content:  "material",
		BankType: "theory",
		Count:    1,
	})
	if err == nil {
		t.Fatal("expected an error when the LLM returns zero questions, got nil")
	}

	var gradeErr *GradeError
	if !errors.As(err, &gradeErr) {
		t.Fatalf("expected error to be *GradeError, got %T: %v", err, err)
	}
	if !strings.Contains(gradeErr.Reason, "failed after 2 attempts") {
		t.Errorf("Reason = %q, want it to contain %q", gradeErr.Reason, "failed after 2 attempts")
	}
	var innerErr *GradeError
	if !errors.As(gradeErr.Wrapped, &innerErr) {
		t.Fatalf("expected Wrapped to be *GradeError, got %T: %v", gradeErr.Wrapped, gradeErr.Wrapped)
	}
	if !strings.Contains(innerErr.Reason, "LLM returned no questions") {
		t.Errorf("inner Reason = %q, want it to contain %q", innerErr.Reason, "LLM returned no questions")
	}
}

func TestGenerateQuestions_NoJSONInResponse(t *testing.T) {
	server := newFixedServer(t, "I couldn't come up with any questions, sorry.")
	defer server.Close()

	g := NewOllamaGrader(server.URL, "test-model")
	_, err := g.GenerateQuestions(context.Background(), GenerateRequest{
		Content:  "material",
		BankType: "code",
		Language: strPtr("go"),
		Count:    3,
	})
	if err == nil {
		t.Fatal("expected an error, got nil")
	}
	var gradeErr *GradeError
	if !errors.As(err, &gradeErr) {
		t.Fatalf("expected error to be *GradeError, got %T: %v", err, err)
	}
}
