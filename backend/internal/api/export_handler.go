package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/remaimber-it/backend/internal/domain/category"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

// ── Request / Response types ────────────────────────────────────────────────

type ExportQuestion struct {
	Subject        string `json:"subject"`
	ExpectedAnswer string `json:"expected_answer"`
}

type ExportBank struct {
	Subject       string           `json:"subject"`
	GradingPrompt *string          `json:"grading_prompt,omitempty"`
	BankType      string           `json:"bank_type"`
	Language      *string          `json:"language,omitempty"`
	Questions     []ExportQuestion `json:"questions"`
}

type ExportCategory struct {
	Name  string       `json:"name"`
	Banks []ExportBank `json:"banks"`
}

type ExportData struct {
	Version    string           `json:"version"`
	ExportedAt string           `json:"exported_at"`
	Categories []ExportCategory `json:"categories"`
}

type ImportResult struct {
	CategoriesCreated int `json:"categories_created"`
	BanksCreated      int `json:"banks_created"`
	QuestionsCreated  int `json:"questions_created"`
}

// ── Handlers ────────────────────────────────────────────────────────────────

// GET /export
func (h *Handler) exportAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	categories, err := h.store.ListCategories(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}

	exportData := ExportData{
		Version:    "1.0",
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Categories: make([]ExportCategory, 0),
	}

	for _, cat := range categories {
		banks, err := h.store.ListBanksByCategory(ctx, cat.ID)
		if err != nil {
			continue
		}

		exportCat := ExportCategory{
			Name:  cat.Name,
			Banks: make([]ExportBank, 0),
		}

		for _, bank := range banks {
			fullBank, err := h.store.GetBank(ctx, bank.ID)
			if err != nil {
				continue
			}

			exportBank := ExportBank{
				Subject:       fullBank.Subject,
				GradingPrompt: fullBank.GradingPrompt,
				BankType:      string(fullBank.BankType),
				Language:      fullBank.Language,
				Questions:     make([]ExportQuestion, len(fullBank.Questions)),
			}

			for i, q := range fullBank.Questions {
				exportBank.Questions[i] = ExportQuestion{
					Subject:        q.Subject,
					ExpectedAnswer: q.ExpectedAnswer,
				}
			}

			exportCat.Banks = append(exportCat.Banks, exportBank)
		}

		exportData.Categories = append(exportData.Categories, exportCat)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=remaimber-export.json")
	json.NewEncoder(w).Encode(exportData)
}

// POST /import
func (h *Handler) importAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var importData ExportData
	if !decodeJSON(w, r, &importData) {
		return
	}

	result := ImportResult{}

	for _, cat := range importData.Categories {
		newCat := category.New(cat.Name)
		if err := h.store.SaveCategory(ctx, newCat); err != nil {
			h.logger.Error("failed to create category", "name", cat.Name, "error", err)
			continue
		}
		result.CategoriesCreated++

		for _, bank := range cat.Banks {
			bankType := questionbank.BankType(bank.BankType)
			if bankType == "" {
				bankType = questionbank.BankTypeTheory
			}

			newBank := questionbank.NewWithOptions(bank.Subject, &newCat.ID, bankType, bank.Language)
			if bank.GradingPrompt != nil {
				newBank.SetGradingPrompt(bank.GradingPrompt)
			}

			if err := h.store.SaveBank(ctx, newBank); err != nil {
				h.logger.Error("failed to create bank", "subject", bank.Subject, "error", err)
				continue
			}
			result.BanksCreated++

			for _, q := range bank.Questions {
				if err := newBank.AddQuestions(q.Subject, q.ExpectedAnswer); err != nil {
					h.logger.Error("failed to add question", "error", err)
					continue
				}
				newQuestion := newBank.Questions[len(newBank.Questions)-1]
				if err := h.store.AddQuestion(ctx, newBank.ID, newQuestion); err != nil {
					h.logger.Error("failed to save question", "error", err)
					continue
				}
				result.QuestionsCreated++
			}
		}
	}

	respondJSON(w, http.StatusCreated, result)
}
