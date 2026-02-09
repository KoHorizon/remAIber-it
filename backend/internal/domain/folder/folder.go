package folder

import "github.com/remaimber-it/backend/internal/id"

// SystemDeletedFolderName is the well-known name of the trash folder.
const SystemDeletedFolderName = "Deleted"

// Folder groups related categories together.
// It sits one level above Category in the hierarchy:
// Folder → Categories → Banks → Questions.
type Folder struct {
	ID       string
	Name     string
	IsSystem bool // System folders (e.g. "Deleted") cannot be renamed
}

// New creates a Folder with a generated ID.
func New(name string) *Folder {
	return &Folder{
		ID:       id.GenerateID(),
		Name:     name,
		IsSystem: false,
	}
}

// NewSystem creates a system folder (e.g. the trash folder).
func NewSystem(name string) *Folder {
	return &Folder{
		ID:       id.GenerateID(),
		Name:     name,
		IsSystem: true,
	}
}

// IsDeletedFolder returns true if this is the system trash folder.
func (f *Folder) IsDeletedFolder() bool {
	return f.IsSystem && f.Name == SystemDeletedFolderName
}
