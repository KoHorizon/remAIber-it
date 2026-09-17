package questionbank

type Question struct {
	ID             string
	Subject        string
	ExpectedAnswer string
	GradingPrompt  *string // Optional per-question grading instructions
	Hint           *string // Optional hint shown to the user during practice, never graded
}
