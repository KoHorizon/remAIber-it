import type { ImportResult } from "../../types";

type Props = {
  result: ImportResult;
  onClose: () => void;
};

export function ImportResultModal({ result, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>✅ Import Complete</h2>
        <div className="import-result">
          {result.folders_created !== undefined && result.folders_created > 0 && (
            <div className="import-stat">
              <span className="import-stat-value">{result.folders_created}</span>
              <span className="import-stat-label">Folders</span>
            </div>
          )}
          <div className="import-stat">
            <span className="import-stat-value">{result.categories_created}</span>
            <span className="import-stat-label">Categories</span>
          </div>
          <div className="import-stat">
            <span className="import-stat-value">{result.banks_created}</span>
            <span className="import-stat-label">Banks</span>
          </div>
          <div className="import-stat">
            <span className="import-stat-value">{result.questions_created}</span>
            <span className="import-stat-label">Questions</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
