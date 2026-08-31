import type { ImportResult } from "../../types";
import { Modal, Button } from "../ui";

type Props = {
  result: ImportResult;
  onClose: () => void;
};

export function ImportResultModal({ result, onClose }: Props) {
  // The backend omits `errors` entirely on a clean import, so its presence is
  // the signal that something was skipped. Import is not transactional — what
  // did get through is already saved, hence "Partially Imported" rather than
  // an outright failure.
  const skipped = result.errors ?? [];

  return (
    <Modal
      title={skipped.length > 0 ? "Partially Imported" : "Import Complete"}
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

      {skipped.length > 0 && (
        <div className="modal-import-errors">
          <span className="modal-import-errors-title">
            {skipped.length} item{skipped.length === 1 ? "" : "s"} skipped
          </span>
          <ul className="modal-import-errors-list">
            {skipped.map((message, i) => (
              /* Messages are not unique — the same failure repeats per item —
                 and the list is never reordered or filtered, so the index is
                 the only stable key available here. */
              // eslint-disable-next-line react/no-array-index-key
              <li key={i}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
