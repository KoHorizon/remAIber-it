import type { Folder, Category } from "../../types";
import { Modal, Button } from "../ui";

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
    <Modal
      title="Move Category"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9375rem" }}>
        Choose a workspace for <strong>"{category.name}"</strong>:
      </p>
      <div className="modal-folder-picker">
        <button
          className={`modal-folder-btn ${category.folder_id === null ? "active" : ""}`}
          onClick={() => handleMove(null)}
        >
          <span className="folder-icon">📋</span>
          No workspace
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            className={`modal-folder-btn ${category.folder_id === f.id ? "active" : ""}`}
            onClick={() => handleMove(f.id)}
          >
            <span className="folder-icon">📁</span>
            {f.name}
          </button>
        ))}
      </div>
    </Modal>
  );
}
