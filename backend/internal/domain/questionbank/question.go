package questionbank

type Question struct {
	ID             string
	Subject        string
	ExpectedAnswer string
	GradingPrompt  *string // Optional per-question grading instructions
}
