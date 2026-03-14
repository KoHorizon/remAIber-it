import "../modals/DeleteConfirmModal.css";

type Props = {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteQuestionModal({ isDeleting, onCancel, onConfirm }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
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
            <h2>Delete Question</h2>
          </div>
          <button type="button" className="delete-modal-close" onClick={onCancel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="delete-modal-content">
          <div className="delete-info-card delete-info-danger">
            <div className="delete-info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className="delete-info-text">This will permanently delete this question</span>
          </div>

          <p className="delete-warning">This action cannot be undone.</p>
        </div>

        {/* Footer */}
        <div className="delete-modal-footer">
          <button
            type="button"
            className="delete-modal-btn delete-modal-btn-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-modal-btn delete-modal-btn-confirm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
