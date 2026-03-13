type Props = {
  bankCount: number;
  isImporting: boolean;
  isExporting: boolean;
  hasContent: boolean;
  canCreateBank: boolean;
  onImport: () => void;
  onExport: () => void;
  onCreateBank: () => void;
};

export function LibraryHeader({
  bankCount,
  isImporting,
  isExporting,
  hasContent,
  canCreateBank,
  onImport,
  onExport,
  onCreateBank,
}: Props) {
  return (
    <div className="library-table-header">
      <div className="library-table-title">
        <h1>Library</h1>
        <span className="library-table-count">{bankCount} banks</span>
      </div>
      <div className="library-table-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onImport}
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : "Import"}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onExport}
          disabled={isExporting || !hasContent}
        >
          {isExporting ? "Exporting..." : "Export"}
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onCreateBank}
          disabled={!canCreateBank}
        >
          + Bank
        </button>
      </div>
    </div>
  );
}
