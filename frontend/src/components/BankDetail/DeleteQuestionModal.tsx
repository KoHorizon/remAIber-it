type Props = {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteQuestionModal({ isDeleting, onCancel, onConfirm }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete Question</h2>
        <p>
          Are you sure you want to delete this question? This action cannot be
          undone.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
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
