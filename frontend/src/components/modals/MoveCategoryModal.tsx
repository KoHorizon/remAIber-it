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
      <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
        Choose a workspace for "{category.name}":
      </p>
      <div className="folder-picker folder-picker-move">
        <button className="folder-pick-btn" onClick={() => handleMove(null)}>
          📋 No workspace
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
    </Modal>
  );
}
