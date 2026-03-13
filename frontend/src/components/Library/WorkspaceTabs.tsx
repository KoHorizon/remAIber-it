import type { Folder } from "../../types";

type Props = {
  folders: Folder[];
  selectedFolderId: string | null;
  editingFolderId: string | null;
  editFolderName: string;
  onSelectFolder: (id: string | null) => void;
  onStartEdit: (e: React.MouseEvent, folder: Folder) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: (folderId: string) => void;
  onCancelEdit: () => void;
  onDelete: (e: React.MouseEvent, folder: Folder) => void;
  onCreateFolder: () => void;
};

export function WorkspaceTabs({
  folders,
  selectedFolderId,
  editingFolderId,
  editFolderName,
  onSelectFolder,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onCreateFolder,
}: Props) {
  if (folders.length === 0) return null;

  return (
    <div className="library-table-tabs">
      <button
        className={`tab-btn ${!selectedFolderId ? "active" : ""}`}
        onClick={() => onSelectFolder(null)}
      >
        All
      </button>
      {folders.map((folder) => (
        <div
          key={folder.id}
          className={`tab-btn ${selectedFolderId === folder.id ? "active" : ""}`}
        >
          {editingFolderId === folder.id ? (
            <input
              type="text"
              className="tab-edit-input"
              value={editFolderName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit(folder.id);
                else if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={() => onSaveEdit(folder.id)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <>
              <button
                className="tab-btn-inner"
                onClick={() =>
                  onSelectFolder(selectedFolderId === folder.id ? null : folder.id)
                }
              >
                {folder.name}
              </button>
              <div className="tab-actions">
                <button onClick={(e) => onStartEdit(e, folder)} title="Rename">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => onDelete(e, folder)}
                  title="Delete"
                  className="danger"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      <button className="tab-btn tab-btn-add" onClick={onCreateFolder}>
        + Workspace
      </button>
    </div>
  );
}
