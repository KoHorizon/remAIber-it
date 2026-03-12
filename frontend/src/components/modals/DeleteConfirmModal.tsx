import { useState } from "react";

export type DeleteModalData = {
  type: "category" | "bank" | "folder";
  id: string;
  name: string;
  bankCount?: number;
  categoryCount?: number;
};

type Props = {
  data: DeleteModalData;
  onClose: () => void;
  onConfirm: (id: string, type: DeleteModalData["type"]) => Promise<void>;
};

export function DeleteConfirmModal({ data, onClose, onConfirm }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onConfirm(data.id, data.type);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to delete:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  const typeLabel =
    data.type === "folder"
      ? "Folder"
      : data.type === "category"
        ? "Category"
        : "Bank";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-delete" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">⚠️</div>
        <h2>Delete {typeLabel}?</h2>

        <div className="delete-modal-content">
          <p className="delete-target">
            <strong>"{data.name}"</strong>
          </p>

          {data.type === "folder" ? (
            <div className="delete-warning">
              <p className="warning-text">
                This will delete the folder. Categories inside will become
                <strong> unfiled</strong> — they won't be deleted.
              </p>
              <ul className="warning-list">
                <li>
                  <span className="warning-count">{data.categoryCount}</span>{" "}
                  categor{data.categoryCount !== 1 ? "ies" : "y"} will become
                  unfiled
                </li>
                <li>No banks or questions will be deleted</li>
              </ul>
            </div>
          ) : data.type === "category" ? (
            <div className="delete-warning">
              <p className="warning-text">
                This will permanently delete this category and all its content:
              </p>
              <ul className="warning-list">
                <li>
                  <span className="warning-count">{data.bankCount}</span>{" "}
                  question bank{data.bankCount !== 1 ? "s" : ""}
                </li>
                <li>All questions within those banks</li>
                <li>All practice session history</li>
              </ul>
              <p className="warning-final">This action cannot be undone.</p>
            </div>
          ) : (
            <div className="delete-warning">
              <p className="warning-text">
                This will permanently delete this bank and all its questions.
              </p>
              <p className="warning-final">This action cannot be undone.</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
