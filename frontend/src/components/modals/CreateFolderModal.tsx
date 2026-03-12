import { useState } from "react";

type Props = {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export function CreateFolderModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create folder:", err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Folder</h2>
        <form onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="folder-name">
            Folder Name
          </label>
          <input
            id="folder-name"
            type="text"
            className="input"
            placeholder="e.g., Backend, Frontend, DevOps"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
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
              {isCreating ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
