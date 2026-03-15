package store

import (
	"context"
	"database/sql"
	"strings"

	"github.com/remaimber-it/backend/internal/domain/category"
	"github.com/remaimber-it/backend/internal/domain/folder"
)

// folderSchema creates the folders table.
const folderSchema = `
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE
);
`

// migrateForFolders runs folder-related migrations on an existing database.
func migrateForFolders(db *sql.DB) error {
	if _, err := db.Exec(folderSchema); err != nil {
		return err
	}
	_ = addColumnIfNotExists(db, "categories", "folder_id", "TEXT REFERENCES folders(id) ON DELETE SET NULL")
	_ = addColumnIfNotExists(db, "folders", "is_system", "BOOLEAN NOT NULL DEFAULT FALSE")
	// Clean up old is_deleted column if it exists from previous iteration
	// (no-op if it doesn't exist — SQLite doesn't support DROP COLUMN before 3.35)
	return nil
}

// ============================================================================
// Folders
// ============================================================================

func (s *SQLiteStore) SaveFolder(ctx context.Context, f *folder.Folder) error {
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO folders (id, name, is_system) VALUES (?, ?, ?)",
		f.ID, f.Name, f.IsSystem,
	)
	return err
}

func (s *SQLiteStore) GetFolder(ctx context.Context, id string) (*folder.Folder, error) {
	var f folder.Folder
	err := s.db.QueryRowContext(ctx,
		"SELECT id, name, COALESCE(is_system, FALSE) FROM folders WHERE id = ?", id,
	).Scan(&f.ID, &f.Name, &f.IsSystem)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// ListFolders returns all folders. System folders (like "Deleted") are only
// included if they have at least one category.
func (s *SQLiteStore) ListFolders(ctx context.Context) ([]*folder.Folder, error) {
	// Query folders and count categories for system folders
	rows, err := s.db.QueryContext(ctx, `
		SELECT f.id, f.name, COALESCE(f.is_system, FALSE),
		       (SELECT COUNT(*) FROM categories c WHERE c.folder_id = f.id) as cat_count
		FROM folders f
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []*folder.Folder
	for rows.Next() {
		var f folder.Folder
		var catCount int
		if err := rows.Scan(&f.ID, &f.Name, &f.IsSystem, &catCount); err != nil {
			return nil, err
		}
		// Only include system folders if they have categories
		if f.IsSystem && catCount == 0 {
			continue
		}
		folders = append(folders, &f)
	}
	return folders, nil
}

func (s *SQLiteStore) UpdateFolder(ctx context.Context, f *folder.Folder) error {
	// Prevent renaming system folders
	existing, err := s.GetFolder(context.Background(), f.ID)
	if err != nil {
		return err
	}
	if existing.IsSystem {
		return ErrSystemFolder
	}

	result, err := s.db.ExecContext(ctx,
		"UPDATE folders SET name = ? WHERE id = ? AND COALESCE(is_system, FALSE) = FALSE",
		f.Name, f.ID,
	)
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

// DeleteFolder handles folder deletion:
//   - System "Deleted" folder: cascade-delete all its content (categories, banks, questions, stats)
//   - Regular folder: move its categories to the "Deleted" folder, then remove the folder
func (s *SQLiteStore) DeleteFolder(ctx context.Context, id string) error {
	f, err := s.GetFolder(ctx, id)
	if err != nil {
		return err
	}

	if f.IsDeletedFolder() {
		return s.EmptyDeletedFolder(ctx)
	}

	// Regular folder: move categories to Deleted folder, then delete the folder
	deletedFolder, err := s.GetOrCreateDeletedFolder(ctx)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Move all categories from this folder to the Deleted folder
	_, err = tx.ExecContext(ctx,
		"UPDATE categories SET folder_id = ? WHERE folder_id = ?",
		deletedFolder.ID, id,
	)
	if err != nil {
		return err
	}

	// Delete the folder itself
	result, err := tx.ExecContext(ctx, "DELETE FROM folders WHERE id = ? AND COALESCE(is_system, FALSE) = FALSE", id)
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

// ============================================================================
// System "Deleted" folder
// ============================================================================

// GetOrCreateDeletedFolder returns the system "Deleted" folder, creating it if needed.
func (s *SQLiteStore) GetOrCreateDeletedFolder(ctx context.Context) (*folder.Folder, error) {
	var f folder.Folder
	err := s.db.QueryRowContext(ctx,
		"SELECT id, name, is_system FROM folders WHERE is_system = TRUE AND name = ?",
		folder.SystemDeletedFolderName,
	).Scan(&f.ID, &f.Name, &f.IsSystem)

	if err == nil {
		return &f, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	// Create it
	f = *folder.NewSystem(folder.SystemDeletedFolderName)
	_, err = s.db.ExecContext(ctx,
		"INSERT INTO folders (id, name, is_system) VALUES (?, ?, ?)",
		f.ID, f.Name, f.IsSystem,
	)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// EmptyDeletedFolder moves all categories from the "Deleted" folder back to "All"
// (folder_id = NULL), then removes the "Deleted" folder itself.
func (s *SQLiteStore) EmptyDeletedFolder(ctx context.Context) error {
	deletedFolder, err := s.GetOrCreateDeletedFolder(ctx)
	if err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	folderID := deletedFolder.ID

	// 1. Move all categories back to "All" (folder_id = NULL)
	_, err = tx.ExecContext(ctx, "UPDATE categories SET folder_id = NULL WHERE folder_id = ?", folderID)
	if err != nil {
		return err
	}

	// 2. Delete the "Deleted" folder itself — it will be recreated on next folder delete
	_, err = tx.ExecContext(ctx, "DELETE FROM folders WHERE id = ?", folderID)
	if err != nil {
		return err
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

func (s *SQLiteStore) GetFolderMasteryBatch(ctx context.Context, folderIDs []string) (map[string]int, error) {
	result := make(map[string]int, len(folderIDs))
	if len(folderIDs) == 0 {
		return result, nil
	}

	placeholders := make([]string, len(folderIDs))
	args := make([]interface{}, len(folderIDs))
	for i, id := range folderIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT c.folder_id, CAST(AVG(COALESCE(qs.mastery, 0)) AS INTEGER)
		FROM questions q
		JOIN banks b ON q.bank_id = b.id
		JOIN categories c ON b.category_id = c.id
		LEFT JOIN question_stats qs ON q.id = qs.question_id
		WHERE c.folder_id IN (`+strings.Join(placeholders, ",")+`)
		GROUP BY c.folder_id
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var mastery int
		if err := rows.Scan(&id, &mastery); err != nil {
			return nil, err
		}
		result[id] = mastery
	}
	return result, nil
}

// ============================================================================
// Category ↔ Folder relationship
// ============================================================================

// ListCategoriesByFolder returns all categories belonging to a folder.
func (s *SQLiteStore) ListCategoriesByFolder(ctx context.Context, folderID string) ([]*category.Category, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name, folder_id, sort_order FROM categories WHERE folder_id = ? ORDER BY sort_order ASC", folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*category.Category
	for rows.Next() {
		var cat category.Category
		var fID sql.NullString
		if err := rows.Scan(&cat.ID, &cat.Name, &fID, &cat.SortOrder); err != nil {
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
