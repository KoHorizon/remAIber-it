package folder_test

import (
	"testing"

	"github.com/remaimber-it/backend/internal/domain/folder"
)

func TestNewFolder(t *testing.T) {
	f := folder.New("Programming")

	if f.Name != "Programming" {
		t.Errorf("expected name %q, got %q", "Programming", f.Name)
	}
	if f.ID == "" {
		t.Error("expected non-empty ID")
	}
	if f.IsSystem {
		t.Error("expected IsSystem to be false for regular folder")
	}
}

func TestNewFolder_UniqueIDs(t *testing.T) {
	f1 := folder.New("A")
	f2 := folder.New("B")
	if f1.ID == f2.ID {
		t.Error("expected different IDs for different folders")
	}
}

func TestNewSystemFolder(t *testing.T) {
	f := folder.NewSystem("Deleted")

	if !f.IsSystem {
		t.Error("expected IsSystem to be true for system folder")
	}
	if !f.IsDeletedFolder() {
		t.Error("expected IsDeletedFolder to return true")
	}
}

func TestIsDeletedFolder_RegularFolder(t *testing.T) {
	f := folder.New("Deleted")
	if f.IsDeletedFolder() {
		t.Error("regular folder named 'Deleted' should not be treated as system deleted folder")
	}
}
