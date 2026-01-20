package category

import "github.com/remaimber-it/backend/internal/id"

type Category struct {
	ID   string
	Name string
}

func New(name string) *Category {
	return &Category{
		ID:   id.GenerateID(),
		Name: name,
	}
}
