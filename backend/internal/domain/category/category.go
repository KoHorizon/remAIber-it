package category

import "github.com/remaimber-it/backend/internal/id"

type Category struct {
	ID       string
	Name     string
	FolderID *string // Optional — nil means uncategorized (no folder)
}

func New(name string) *Category {
	return &Category{
		ID:       id.GenerateID(),
		Name:     name,
		FolderID: nil,
	}
}

// NewWithFolder creates a category assigned to a folder.
func NewWithFolder(name string, folderID string) *Category {
	return &Category{
		ID:       id.GenerateID(),
		Name:     name,
		FolderID: &folderID,
	}
}

// SetFolder assigns the category to a folder (or removes it with nil).
func (c *Category) SetFolder(folderID *string) {
	c.FolderID = folderID
}
