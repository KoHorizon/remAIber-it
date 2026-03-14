import { useState } from "react";
import "./DeleteConfirmModal.css";

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div className="delete-modal-title">
            <h2>Delete {typeLabel}</h2>
            <p className="delete-modal-name">{data.name}</p>
          </div>
          <button type="button" className="delete-modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="delete-modal-content">
          {data.type === "folder" ? (
            <>
              <div className="delete-info-card">
                <div className="delete-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <span className="delete-info-text">
                  Categories will become <strong>unfiled</strong>
                </span>
              </div>

              <div className="delete-stats">
                <div className="delete-stat-item">
                  <span className="delete-stat-value">{data.categoryCount ?? 0}</span>
                  <span className="delete-stat-label">
                    Categor{(data.categoryCount ?? 0) !== 1 ? "ies" : "y"}
                  </span>
                </div>
              </div>

              <p className="delete-note">No banks or questions will be deleted.</p>
            </>
          ) : data.type === "category" ? (
            <>
              <div className="delete-info-card delete-info-danger">
                <div className="delete-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <span className="delete-info-text">This will permanently delete all content</span>
              </div>

              <div className="delete-stats">
                <div className="delete-stat-item">
                  <span className="delete-stat-value">{data.bankCount ?? 0}</span>
                  <span className="delete-stat-label">
                    Bank{(data.bankCount ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <p className="delete-warning">This action cannot be undone.</p>
            </>
          ) : (
            <>
              <div className="delete-info-card delete-info-danger">
                <div className="delete-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <span className="delete-info-text">This will permanently delete this bank and all questions</span>
              </div>

              <p className="delete-warning">This action cannot be undone.</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="delete-modal-footer">
          <button
            type="button"
            className="delete-modal-btn delete-modal-btn-cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-modal-btn delete-modal-btn-confirm"
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
