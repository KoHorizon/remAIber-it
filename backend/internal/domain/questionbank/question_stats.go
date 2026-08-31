package questionbank

// CorrectScoreThreshold is the score at or above which an answer counts as correct.
const CorrectScoreThreshold = 70

// QuestionStats tracks performance statistics for a single question
type QuestionStats struct {
	QuestionID    string
	TimesAnswered int
	TimesCorrect  int // Score >= CorrectScoreThreshold considered correct
	TotalScore    int // Sum of all scores
	LatestScore   int // Most recent score
	Mastery       int // Calculated mastery level (0-100)
}

// RecordScore applies a newly graded score, updating the counters and mastery.
//
// This is the only supported way to advance QuestionStats. Persistence layers
// must call it rather than reimplementing the arithmetic in SQL — doing so is
// how the stored mastery previously drifted away from CalculateMastery.
func (qs *QuestionStats) RecordScore(score int) {
	qs.TimesAnswered++
	qs.TotalScore += score
	qs.LatestScore = score
	if score >= CorrectScoreThreshold {
		qs.TimesCorrect++
	}
	qs.Mastery = qs.CalculateMastery()
}

// CalculateMastery computes mastery based on Option 3 formula:
// mastery = (latest_score * 0.6) + (historical_average * 0.4)
//
// historical_average deliberately EXCLUDES the latest score, so a single
// attempt is not counted twice. Expects the counters to already include the
// latest score (i.e. call it after RecordScore has updated them).
func (qs *QuestionStats) CalculateMastery() int {
	if qs.TimesAnswered == 0 {
		return 0
	}

	if qs.TimesAnswered == 1 {
		// First attempt - mastery equals the score
		return qs.LatestScore
	}

	// Historical average (excluding latest)
	historicalAvg := float64(qs.TotalScore-qs.LatestScore) / float64(qs.TimesAnswered-1)

	// Option 3: latest * 0.6 + historical_avg * 0.4
	mastery := int(float64(qs.LatestScore)*0.6 + historicalAvg*0.4)
	if mastery > 100 {
		mastery = 100
	}
	if mastery < 0 {
		mastery = 0
	}
	return mastery
}

// BankStats aggregates statistics for a question bank
type BankStats struct {
	BankID         string
	TotalQuestions int
	Mastery        int // Average mastery across all questions
}

// CategoryStats aggregates statistics for a category
type CategoryStats struct {
	CategoryID string
	Mastery    int // Average mastery across all banks
}
