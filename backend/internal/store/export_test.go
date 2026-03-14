package store

import "database/sql"

// ExposedAddColumnIfNotExists exposes addColumnIfNotExists for white-box testing.
func ExposedAddColumnIfNotExists(db *sql.DB, table, column, definition string) error {
	return addColumnIfNotExists(db, table, column, definition)
}
