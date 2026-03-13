import type { ImportResult } from "../../types";
import { Modal, Button } from "../ui";

type Props = {
  result: ImportResult;
  onClose: () => void;
};

export function ImportResultModal({ result, onClose }: Props) {
  return (
    <Modal
      title="Import Complete"
      onClose={onClose}
      showCloseButton={false}
      actions={<Button onClick={onClose}>Done</Button>}
    >
      <div className="modal-import-stats">
        {result.folders_created !== undefined && result.folders_created > 0 && (
          <div className="modal-import-stat">
            <span className="value">{result.folders_created}</span>
            <span className="label">Workspaces</span>
          </div>
        )}
        <div className="modal-import-stat">
          <span className="value">{result.categories_created}</span>
          <span className="label">Categories</span>
        </div>
        <div className="modal-import-stat">
          <span className="value">{result.banks_created}</span>
          <span className="label">Banks</span>
        </div>
        <div className="modal-import-stat">
          <span className="value">{result.questions_created}</span>
          <span className="label">Questions</span>
        </div>
      </div>
    </Modal>
  );
}
