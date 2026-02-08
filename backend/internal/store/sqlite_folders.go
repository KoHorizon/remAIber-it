package store

import (
	"context"
	"database/sql"

	"github.com/remaimber-it/backend/internal/domain/category"
	"github.com/remaimber-it/backend/internal/domain/folder"
)

// folderSchema creates the folders table and adds folder_id to categories.
// Called from NewSQLite after the base schema.
const folderSchema = `
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
`

// migrateForFolders runs folder-related migrations on an existing database.
func migrateForFolders(db *sql.DB) error {
	if _, err := db.Exec(folderSchema); err != nil {
		return err
	}
	// Add folder_id column to categories if it doesn't exist
	_ = addColumnIfNotExists(db, "categories", "folder_id", "TEXT REFERENCES folders(id) ON DELETE SET NULL")
	return nil
}

// ============================================================================
// Folders
// ============================================================================

func (s *SQLiteStore) SaveFolder(ctx context.Context, f *folder.Folder) error {
	_, err := s.db.ExecContext(ctx, "INSERT INTO folders (id, name) VALUES (?, ?)", f.ID, f.Name)
	return err
}

func (s *SQLiteStore) GetFolder(ctx context.Context, id string) (*folder.Folder, error) {
	var f folder.Folder
	err := s.db.QueryRowContext(ctx, "SELECT id, name FROM folders WHERE id = ?", id).Scan(&f.ID, &f.Name)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *SQLiteStore) ListFolders(ctx context.Context) ([]*folder.Folder, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name FROM folders")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []*folder.Folder
	for rows.Next() {
		var f folder.Folder
		if err := rows.Scan(&f.ID, &f.Name); err != nil {
			return nil, err
		}
		folders = append(folders, &f)
	}
	return folders, nil
}

func (s *SQLiteStore) UpdateFolder(ctx context.Context, f *folder.Folder) error {
	result, err := s.db.ExecContext(ctx, "UPDATE folders SET name = ? WHERE id = ?", f.Name, f.ID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

// DeleteFolder removes a folder. Categories in the folder have their
// folder_id set to NULL (they become "unfiled"), they are NOT deleted.
func (s *SQLiteStore) DeleteFolder(ctx context.Context, id string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Unlink categories from this folder
	_, err = tx.ExecContext(ctx, "UPDATE categories SET folder_id = NULL WHERE folder_id = ?", id)
	if err != nil {
		return err
	}

	result, err := tx.ExecContext(ctx, "DELETE FROM folders WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}

	return tx.Commit()
}

// GetFolderMastery returns the average mastery across all questions in all
// banks in all categories belonging to the folder.
func (s *SQLiteStore) GetFolderMastery(ctx context.Context, folderID string) (int, error) {
	var mastery sql.NullFloat64
	err := s.db.QueryRowContext(ctx, `
		SELECT AVG(COALESCE(qs.mastery, 0))
		FROM questions q
		JOIN banks b ON q.bank_id = b.id
		JOIN categories c ON b.category_id = c.id
		LEFT JOIN question_stats qs ON q.id = qs.question_id
		WHERE c.folder_id = ?
	`, folderID).Scan(&mastery)

	if err != nil {
		return 0, err
	}
	if !mastery.Valid {
		return 0, nil
	}
	return int(mastery.Float64), nil
}

// ============================================================================
// Category ↔ Folder relationship
// ============================================================================

// ListCategoriesByFolder returns all categories belonging to a folder.
func (s *SQLiteStore) ListCategoriesByFolder(ctx context.Context, folderID string) ([]*category.Category, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name, folder_id FROM categories WHERE folder_id = ?", folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*category.Category
	for rows.Next() {
		var cat category.Category
		var fID sql.NullString
		if err := rows.Scan(&cat.ID, &cat.Name, &fID); err != nil {
			return nil, err
		}
		if fID.Valid {
			cat.FolderID = &fID.String
		}
		categories = append(categories, &cat)
	}
	return categories, nil
}

// UpdateCategoryFolder moves a category to a different folder (or removes it with nil).
func (s *SQLiteStore) UpdateCategoryFolder(ctx context.Context, categoryID string, folderID *string) error {
	result, err := s.db.ExecContext(ctx, "UPDATE categories SET folder_id = ? WHERE id = ?", folderID, categoryID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
