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
}

func TestNewFolder_UniqueIDs(t *testing.T) {
	f1 := folder.New("A")
	f2 := folder.New("B")

	if f1.ID == f2.ID {
		t.Error("expected different IDs for different folders")
	}
}
