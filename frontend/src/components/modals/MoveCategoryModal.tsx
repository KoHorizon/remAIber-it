import type { Folder, Category } from "../../types";

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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Move Category</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Choose a folder for "{category.name}":
        </p>
        <div className="folder-picker folder-picker-move">
          <button
            className="folder-pick-btn"
            onClick={() => handleMove(null)}
          >
            📋 Unfiled (no folder)
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={`folder-pick-btn ${category.folder_id === f.id ? "active" : ""}`}
              onClick={() => handleMove(f.id)}
            >
              📁 {f.name}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
