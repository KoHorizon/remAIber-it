package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/remaimber-it/backend/internal/domain/category"
	"github.com/remaimber-it/backend/internal/domain/folder"
	"github.com/remaimber-it/backend/internal/domain/questionbank"
)

// ── Request / Response types ────────────────────────────────────────────────

type ExportQuestion struct {
	Subject        string  `json:"subject" example:"What is a goroutine?"`
	ExpectedAnswer string  `json:"expected_answer" example:"A goroutine is a lightweight thread managed by the Go runtime."`
	GradingPrompt  *string `json:"grading_prompt,omitempty"`
}

type ExportBank struct {
	Subject   string           `json:"subject" example:"Go concurrency patterns"`
	BankType  string           `json:"bank_type" example:"theory"`
	Language  *string          `json:"language,omitempty" example:"go"`
	Questions []ExportQuestion `json:"questions"`
}

type ExportCategory struct {
	Name  string       `json:"name" example:"Golang"`
	Banks []ExportBank `json:"banks"`
}

type ExportFolder struct {
	Name       string           `json:"name" example:"Programming"`
	Categories []ExportCategory `json:"categories"`
}

type ExportData struct {
	Version    string           `json:"version" example:"1.1"`
	ExportedAt string           `json:"exported_at" example:"2025-01-15T10:30:00Z"`
	Folders    []ExportFolder   `json:"folders,omitempty"`
	Categories []ExportCategory `json:"categories"` // Categories without a folder
}

// Validate rejects a payload with nothing to import. Without this a `{}` body
// returned 201 and all-zero counts, which the UI presented as a successful
// import of an empty file — indistinguishable from a genuinely empty export.
//
// Version and ExportedAt are deliberately not required: v1.0 exports predate
// some of these fields, and refusing an otherwise-valid file over a missing
// timestamp would break restoring old backups.
func (d *ExportData) Validate() error {
	if len(d.Folders) == 0 && len(d.Categories) == 0 {
		return errors.New("nothing to import: no folders or categories in payload")
	}
	return nil
}

type ImportResult struct {
	FoldersCreated    int `json:"folders_created" example:"3"`
	CategoriesCreated int `json:"categories_created" example:"2"`
	BanksCreated      int `json:"banks_created" example:"5"`
	QuestionsCreated  int `json:"questions_created" example:"42"`

	// Errors lists everything that was skipped. Omitted entirely when the import
	// was clean, so its presence alone means "not everything came through".
	// The import is not transactional — see importAll — so a partial result is a
	// real outcome the user has to be told about rather than a failure to hide.
	Errors []string `json:"errors,omitempty"`
}

// fail records a skipped item on the result and logs it.
func (h *Handler) importFail(result *ImportResult, err error, msg string, args ...any) {
	h.logger.Error(msg, append(args, "error", err)...)
	result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", msg, err))
}

// ── Handlers ────────────────────────────────────────────────────────────────

// exportAll exports all data as a JSON file.
// @Summary      Export all data
// @Description  Export all folders, categories, banks, and questions as a downloadable JSON file. The system "Deleted" folder and its contents are excluded.
// @Tags         Import/Export
// @Produce      json
// @Success      200  {object}  ExportData
// @Failure      500  {object}  map[string]string
// @Router       /export [get]
func (h *Handler) exportAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	exportData := ExportData{
		Version:    "1.1",
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Folders:    make([]ExportFolder, 0),
		Categories: make([]ExportCategory, 0),
	}

	// Export folders with their categories (skip system folders)
	folders, err := h.store.ListFolders(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load folders")
		return
	}

	categoriesInFolders := make(map[string]bool)

	for _, f := range folders {
		// Skip the system "Deleted" folder
		if f.IsSystem {
			// Still mark its categories as handled so they don't appear in unfiled
			cats, _ := h.store.ListCategoriesByFolder(ctx, f.ID)
			for _, cat := range cats {
				categoriesInFolders[cat.ID] = true
			}
			continue
		}

		categories, err := h.store.ListCategoriesByFolder(ctx, f.ID)
		if err != nil {
			h.logger.Error("failed to list categories for folder", "folder_id", f.ID, "error", err)
			continue
		}

		exportFolder := ExportFolder{
			Name:       f.Name,
			Categories: make([]ExportCategory, 0),
		}

		for _, cat := range categories {
			categoriesInFolders[cat.ID] = true
			exportCat := h.buildExportCategory(ctx, cat)
			exportFolder.Categories = append(exportFolder.Categories, exportCat)
		}

		exportData.Folders = append(exportData.Folders, exportFolder)
	}

	// Export categories that are NOT in any folder
	allCategories, err := h.store.ListCategories(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to load categories")
		return
	}

	for _, cat := range allCategories {
		if categoriesInFolders[cat.ID] {
			continue
		}
		exportCat := h.buildExportCategory(ctx, cat)
		exportData.Categories = append(exportData.Categories, exportCat)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=remaimber-export.json")
	if err := json.NewEncoder(w).Encode(exportData); err != nil {
		h.logger.Error("failed to encode export", "error", err)
	}
}

// buildExportCategory creates an ExportCategory from a category entity.
func (h *Handler) buildExportCategory(ctx context.Context, cat *category.Category) ExportCategory {
	banks, err := h.store.ListBanksByCategory(ctx, cat.ID)
	if err != nil {
		h.logger.Error("failed to list banks for category", "category_id", cat.ID, "error", err)
		return ExportCategory{Name: cat.Name, Banks: make([]ExportBank, 0)}
	}

	exportCat := ExportCategory{
		Name:  cat.Name,
		Banks: make([]ExportBank, 0),
	}

	for _, bank := range banks {
		fullBank, err := h.store.GetBank(ctx, bank.ID)
		if err != nil {
			h.logger.Error("failed to get bank", "bank_id", bank.ID, "error", err)
			continue
		}

		exportBank := ExportBank{
			Subject:   fullBank.Subject,
			BankType:  string(fullBank.BankType),
			Language:  fullBank.Language,
			Questions: make([]ExportQuestion, len(fullBank.Questions)),
		}

		for i, q := range fullBank.Questions {
			exportBank.Questions[i] = ExportQuestion{
				Subject:        q.Subject,
				ExpectedAnswer: q.ExpectedAnswer,
				GradingPrompt:  q.GradingPrompt,
			}
		}

		exportCat.Banks = append(exportCat.Banks, exportBank)
	}

	return exportCat
}

// importAll imports data from a previously exported JSON payload.
// @Summary      Import data
// @Description  Import folders, categories, banks, and questions from a JSON export. New IDs are generated for all entities.
// @Tags         Import/Export
// @Accept       json
// @Produce      json
// @Param        body  body      ExportData    true  "Export data to import"
// @Success      201   {object}  ImportResult
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /import [post]
// Note on atomicity: this is deliberately not transactional. Making it so would
// need the Store interface to expose a transaction (every method reimplemented
// against *sql.Tx) or an ImportAll store method, which would pull domain
// construction into the persistence layer. Instead each skipped item is recorded
// in result.Errors so a partial import reports itself as partial rather than as
// a success with quietly missing rows.
func (h *Handler) importAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var importData ExportData
	if !decodeAndValidate(w, r, &importData) {
		return
	}

	result := ImportResult{}

	// Import folders and their categories
	for _, f := range importData.Folders {
		newFolder := folder.New(f.Name)
		if err := h.store.SaveFolder(ctx, newFolder); err != nil {
			h.importFail(&result, err, "failed to create folder", "name", f.Name)
			continue
		}
		result.FoldersCreated++

		for _, cat := range f.Categories {
			newCat := category.NewWithFolder(cat.Name, newFolder.ID)
			if err := h.store.SaveCategory(ctx, newCat); err != nil {
				h.importFail(&result, err, "failed to create category", "name", cat.Name)
				continue
			}
			result.CategoriesCreated++

			h.importBanks(ctx, cat.Banks, newCat.ID, &result)
		}
	}

	// Import unfiled categories (backward compatible with v1.0 exports)
	for _, cat := range importData.Categories {
		newCat := category.New(cat.Name)
		if err := h.store.SaveCategory(ctx, newCat); err != nil {
			h.importFail(&result, err, "failed to create category", "name", cat.Name)
			continue
		}
		result.CategoriesCreated++

		h.importBanks(ctx, cat.Banks, newCat.ID, &result)
	}

	respondJSON(w, http.StatusCreated, result)
}

// importBanks imports banks and their questions into a category.
func (h *Handler) importBanks(ctx context.Context, banks []ExportBank, categoryID string, result *ImportResult) {
	for _, bank := range banks {
		var bankType questionbank.BankType
		switch questionbank.BankType(bank.BankType) {
		case questionbank.BankTypeCode:
			bankType = questionbank.BankTypeCode
		case questionbank.BankTypeCLI:
			bankType = questionbank.BankTypeCLI
		default:
			bankType = questionbank.BankTypeTheory
		}

		newBank := questionbank.NewWithOptions(bank.Subject, &categoryID, bankType, bank.Language)

		if err := h.store.SaveBank(ctx, newBank); err != nil {
			h.importFail(result, err, "failed to create bank", "subject", bank.Subject)
			continue
		}
		result.BanksCreated++

		for _, q := range bank.Questions {
			if err := newBank.AddQuestionWithGradingPrompt(q.Subject, q.ExpectedAnswer, q.GradingPrompt); err != nil {
				h.importFail(result, err, "failed to add question", "bank", bank.Subject)
				continue
			}
			newQuestion := newBank.Questions[len(newBank.Questions)-1]
			if err := h.store.AddQuestion(ctx, newBank.ID, newQuestion); err != nil {
				h.importFail(result, err, "failed to save question", "bank", bank.Subject)
				continue
			}
			result.QuestionsCreated++
		}
	}
}
