import { useState } from "react";
import type { Folder, Category } from "../../types";
import "./MoveCategoryModal.css";

type Props = {
  category: Category;
  folders: Folder[];
  onClose: () => void;
  onMove: (categoryId: string, folderId: string | null) => Promise<void>;
};

export function MoveCategoryModal({
  category,
  folders,
  onClose,
  onMove,
}: Props) {
  const [search, setSearch] = useState("");

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const showSearch = folders.length > 5;

  async function handleMove(folderId: string | null) {
    try {
      await onMove(category.id, folderId);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to move category:", err);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="move-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="move-modal-header">
          <div className="move-modal-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="move-modal-title">
            <h2>Move Category</h2>
            <p className="move-modal-name">{category.name}</p>
          </div>
          <button type="button" className="move-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Default option - always visible at top */}
        <div className="move-modal-default">
          <button
            className={`move-option move-option-default ${category.folder_id === null ? "active" : ""}`}
            onClick={() => handleMove(null)}
          >
            <span className="move-option-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </span>
            <span className="move-option-name">No workspace</span>
            {category.folder_id === null && (
              <span className="move-option-current">Current</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="move-modal-content">
          <span className="move-modal-label">Workspaces</span>
          {showSearch && (
            <div className="move-modal-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="move-modal-options">
            {filteredFolders.map((f) => (
              <button
                key={f.id}
                className={`move-option ${category.folder_id === f.id ? "active" : ""}`}
                onClick={() => handleMove(f.id)}
              >
                <span className="move-option-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="move-option-name">{f.name}</span>
                {category.folder_id === f.id && (
                  <span className="move-option-current">Current</span>
                )}
              </button>
            ))}
            {search && filteredFolders.length === 0 && (
              <p className="move-modal-empty">No workspaces found</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="move-modal-footer">
          <button
            type="button"
            className="move-modal-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
