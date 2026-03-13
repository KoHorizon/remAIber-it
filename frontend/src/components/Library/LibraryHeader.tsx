import { Button } from "../ui";

type Props = {
  bankCount: number;
  isImporting: boolean;
  isExporting: boolean;
  hasContent: boolean;
  onImport: () => void;
  onExport: () => void;
};

export function LibraryHeader({
  bankCount,
  isImporting,
  isExporting,
  hasContent,
  onImport,
  onExport,
}: Props) {
  return (
    <div className="library-table-header">
      <div className="library-table-title">
        <h1>Library</h1>
        <span className="library-table-count">{bankCount} banks</span>
      </div>
      <div className="library-table-actions">
        <Button variant="ghost" size="sm" onClick={onImport} disabled={isImporting}>
          {isImporting ? "Importing..." : "Import"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onExport} disabled={isExporting || !hasContent}>
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </div>
    </div>
  );
}
