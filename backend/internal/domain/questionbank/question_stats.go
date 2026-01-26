package questionbank

// QuestionStats tracks performance statistics for a single question
type QuestionStats struct {
	QuestionID    string
	TimesAnswered int
	TimesCorrect  int // Score >= 70 considered correct
	TotalScore    int // Sum of all scores
	Mastery       int // Calculated mastery level (0-100)
}

// CalculateMastery computes mastery based on answer history
// Mastery = (average score * 0.7) + (consistency bonus * 0.3)
func (qs *QuestionStats) CalculateMastery() int {
	if qs.TimesAnswered == 0 {
		return 0
	}

	// Average score component (70% weight)
	avgScore := float64(qs.TotalScore) / float64(qs.TimesAnswered)

	// Consistency component (30% weight) - ratio of correct answers
	consistency := float64(qs.TimesCorrect) / float64(qs.TimesAnswered) * 100

	mastery := int(avgScore*0.7 + consistency*0.3)
	if mastery > 100 {
		mastery = 100
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
