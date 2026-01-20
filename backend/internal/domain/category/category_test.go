package category_test

import (
	"testing"

	"github.com/remaimber-it/backend/internal/domain/category"
)

func TestNewCategory(t *testing.T) {
	cat := category.New("Golang")

	if cat.Name != "Golang" {
		t.Errorf("expected name %q, got %q", "Golang", cat.Name)
	}

	if cat.ID == "" {
		t.Error("expected non-empty ID")
	}
}
