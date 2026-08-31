import { Button, Modal } from "../ui";

type Props = {
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

/**
 * Full-height editor for one block of study material. Wrapped in
 * `aigen-content-modal`, which widens the dialog — pasted documentation needs
 * more room than the standard modal gives.
 */
export function StudyMaterialModal({
  value,
  isEditing,
  onChange,
  onSave,
  onClose,
}: Props) {
  return (
    <div className="aigen-content-modal">
      <Modal
        title={isEditing ? "Edit Content" : "Add Study Material"}
        onClose={onClose}
        actions={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSave} disabled={!value.trim()}>
              {isEditing ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="aigen-modal-content">
          <textarea
            className="aigen-modal-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your study material, documentation, or notes here..."
            autoFocus
          />
          <span className="aigen-modal-char-count">
            {value.length.toLocaleString()} characters
          </span>
        </div>
      </Modal>
    </div>
  );
}
