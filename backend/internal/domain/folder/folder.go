package folder

import "github.com/remaimber-it/backend/internal/id"

// Folder groups related categories together.
// It sits one level above Category in the hierarchy:
// Folder → Categories → Banks → Questions.
type Folder struct {
	ID   string
	Name string
}

// New creates a Folder with a generated ID.
func New(name string) *Folder {
	return &Folder{
		ID:   id.GenerateID(),
		Name: name,
	}
}
