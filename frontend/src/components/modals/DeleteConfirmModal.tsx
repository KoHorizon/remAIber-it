import { useState } from "react";
import { Modal, Button } from "../ui";

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
      ? "Workspace"
      : data.type === "category"
        ? "Category"
        : "Bank";

  return (
    <Modal
      title={`Delete ${typeLabel}?`}
      onClose={onClose}
      variant="delete"
      showCloseButton={false}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </>
      }
    >
      <div className="modal-delete-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--error)"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <p className="modal-delete-target">"{data.name}"</p>

      <div className="modal-delete-warning">
        {data.type === "folder" ? (
          <>
            <p>
              This will delete the workspace. Categories inside will become
              <strong> unfiled</strong> — they won't be deleted.
            </p>
            <ul>
              <li>
                <span className="count">{data.categoryCount}</span>{" "}
                categor{data.categoryCount !== 1 ? "ies" : "y"} will become unfiled
              </li>
              <li>No banks or questions will be deleted</li>
            </ul>
          </>
        ) : data.type === "category" ? (
          <>
            <p>This will permanently delete this category and all its content:</p>
            <ul>
              <li>
                <span className="count">{data.bankCount}</span> question
                {data.bankCount !== 1 ? " banks" : " bank"}
              </li>
              <li>All questions within those banks</li>
              <li>All practice session history</li>
            </ul>
            <p className="final">This action cannot be undone.</p>
          </>
        ) : (
          <>
            <p>This will permanently delete this bank and all its questions.</p>
            <p className="final">This action cannot be undone.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
