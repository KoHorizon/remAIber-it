package questionbank_test

import (
	"testing"

	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

func TestCalculateMastery(t *testing.T) {
	tests := []struct {
		name          string
		timesAnswered int
		totalScore    int
		latestScore   int
		want          int
	}{
		{"never answered", 0, 0, 0, 0},
		{"first attempt equals the score", 1, 80, 80, 80},
		{"first attempt zero", 1, 0, 0, 0},
		// Two attempts of 60 then 90: historical average excludes the latest,
		// so it is 60 exactly. 90*0.6 + 60*0.4 = 78.
		{"two attempts weights latest 60/40", 2, 150, 90, 78},
		// Same totals, but the latest attempt was the weak one: 60*0.6 + 90*0.4 = 72.
		{"regression lowers mastery", 2, 150, 60, 72},
		// Three attempts 100, 100, 40: historical avg = 200/2 = 100.
		// 40*0.6 + 100*0.4 = 64.
		{"three attempts", 3, 240, 40, 64},
		{"perfect run stays 100", 3, 300, 100, 100},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			qs := questionbank.QuestionStats{
				TimesAnswered: tc.timesAnswered,
				TotalScore:    tc.totalScore,
				LatestScore:   tc.latestScore,
			}
			if got := qs.CalculateMastery(); got != tc.want {
				t.Errorf("CalculateMastery() = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestCalculateMastery_ClampsToRange(t *testing.T) {
	// Scores are expected in [0,100], but the clamp must hold regardless.
	high := questionbank.QuestionStats{TimesAnswered: 2, TotalScore: 400, LatestScore: 200}
	if got := high.CalculateMastery(); got != 100 {
		t.Errorf("expected mastery clamped to 100, got %d", got)
	}

	low := questionbank.QuestionStats{TimesAnswered: 2, TotalScore: -50, LatestScore: -25}
	if got := low.CalculateMastery(); got != 0 {
		t.Errorf("expected mastery clamped to 0, got %d", got)
	}
}

// TestCalculateMastery_ExcludesLatestFromHistory guards the specific bug that the
// persistence layer used to reintroduce: averaging the latest score into the
// "historical" average double-counts it and inflates mastery.
func TestCalculateMastery_ExcludesLatestFromHistory(t *testing.T) {
	qs := questionbank.QuestionStats{TimesAnswered: 2, TotalScore: 150, LatestScore: 90}

	got := qs.CalculateMastery()

	const wantCorrect = 78 // 90*0.6 + (60/1)*0.4
	const wantIfLatestDoubleCounted = 84
	if got == wantIfLatestDoubleCounted {
		t.Fatalf("mastery %d indicates the latest score was averaged into history", got)
	}
	if got != wantCorrect {
		t.Errorf("CalculateMastery() = %d, want %d", got, wantCorrect)
	}
}

func TestRecordScore(t *testing.T) {
	var qs questionbank.QuestionStats

	qs.RecordScore(60)
	if qs.TimesAnswered != 1 || qs.TotalScore != 60 || qs.LatestScore != 60 {
		t.Fatalf("after first score: %+v", qs)
	}
	if qs.TimesCorrect != 0 {
		t.Errorf("60 is below the correct threshold, got TimesCorrect=%d", qs.TimesCorrect)
	}
	if qs.Mastery != 60 {
		t.Errorf("first attempt mastery = %d, want 60", qs.Mastery)
	}

	qs.RecordScore(90)
	if qs.TimesAnswered != 2 || qs.TotalScore != 150 || qs.LatestScore != 90 {
		t.Fatalf("after second score: %+v", qs)
	}
	if qs.TimesCorrect != 1 {
		t.Errorf("90 is at or above the correct threshold, got TimesCorrect=%d", qs.TimesCorrect)
	}
	if qs.Mastery != 78 {
		t.Errorf("mastery = %d, want 78", qs.Mastery)
	}
}

func TestRecordScore_CorrectThreshold(t *testing.T) {
	tests := []struct {
		score       int
		wantCorrect int
	}{
		{questionbank.CorrectScoreThreshold - 1, 0},
		{questionbank.CorrectScoreThreshold, 1}, // boundary is inclusive
		{questionbank.CorrectScoreThreshold + 1, 1},
		{0, 0},
		{100, 1},
	}

	for _, tc := range tests {
		var qs questionbank.QuestionStats
		qs.RecordScore(tc.score)
		if qs.TimesCorrect != tc.wantCorrect {
			t.Errorf("score %d: TimesCorrect = %d, want %d", tc.score, qs.TimesCorrect, tc.wantCorrect)
		}
	}
}

// TestRecordScore_MasteryMatchesCalculate asserts RecordScore leaves Mastery in
// sync with CalculateMastery for a long run of scores.
func TestRecordScore_MasteryMatchesCalculate(t *testing.T) {
	var qs questionbank.QuestionStats

	for _, score := range []int{100, 40, 70, 0, 95, 60} {
		qs.RecordScore(score)
		if want := qs.CalculateMastery(); qs.Mastery != want {
			t.Fatalf("after score %d: Mastery = %d, CalculateMastery() = %d", score, qs.Mastery, want)
		}
		if qs.Mastery < 0 || qs.Mastery > 100 {
			t.Fatalf("mastery %d out of range", qs.Mastery)
		}
	}
}
