import { useState } from "react";
import type { Folder } from "../../types";

type Props = {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onClose: () => void;
  onCreate: (name: string, folderId?: string) => Promise<void>;
};

export function CreateCategoryModal({
  folders,
  selectedFolderId,
  onSelectFolder,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const hasFolders = folders.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreate(name.trim(), selectedFolderId || undefined);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create category:", err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Category</h2>
        <form onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="category-name">
            Category Name
          </label>
          <input
            id="category-name"
            type="text"
            className="input"
            placeholder="e.g., Programming, Science, Languages"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {hasFolders && (
            <div className="input-group" style={{ marginTop: "1rem" }}>
              <label className="input-label">
                Folder {selectedFolderId && "(pre-selected)"}
              </label>
              <div className="folder-picker">
                <button
                  type="button"
                  className={`folder-pick-btn ${!selectedFolderId ? "active" : ""}`}
                  onClick={() => onSelectFolder(null)}
                >
                  None (unfiled)
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`folder-pick-btn ${selectedFolderId === f.id ? "active" : ""}`}
                    onClick={() => onSelectFolder(f.id)}
                  >
                    📁 {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
