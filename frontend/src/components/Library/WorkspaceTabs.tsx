import { useState } from "react";
import type { Folder } from "../../types";
import { Dropdown, AddChip, IconButton, ChipIcons } from "../ui";

type Props = {
  folders: Folder[];
  selectedFolderId: string | null;
  editingFolderId: string | null;
  editFolderName: string;
  onSelectFolder: (id: string | null) => void;
  onStartEdit: (folder: Folder) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: (folderId: string) => void;
  onCancelEdit: () => void;
  onDelete: (folder: Folder) => void;
  onCreateFolder: (name: string) => Promise<void>;
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
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;
  const isEditingSelected = editingFolderId !== null && editingFolderId === selectedFolderId;

  async function handleCreate() {
    if (!newFolderName.trim()) {
      setIsCreating(false);
      return;
    }
    try {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  }

  function handleCancelCreate() {
    setNewFolderName("");
    setIsCreating(false);
  }

  return (
    <div className="workspace-bar">
      {isEditingSelected ? (
        <input
          className="workspace-edit-input"
          autoFocus
          value={editFolderName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit(editingFolderId);
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={() => onSaveEdit(editingFolderId)}
        />
      ) : (
        <Dropdown
          options={folders.map((f) => ({ value: f.id, label: f.name }))}
          value={selectedFolderId}
          onChange={onSelectFolder}
          placeholder="Choose a workspace…"
        />
      )}

      {selectedFolder && !isEditingSelected && (
        <div className="workspace-actions">
          <IconButton
            icon={ChipIcons.edit}
            label="Rename workspace"
            size="sm"
            onClick={() => onStartEdit(selectedFolder)}
          />
          <IconButton
            icon={ChipIcons.delete}
            label="Delete workspace"
            size="sm"
            variant="danger"
            onClick={() => onDelete(selectedFolder)}
          />
        </div>
      )}

      <AddChip
        label="+ Workspace"
        isCreating={isCreating}
        createValue={newFolderName}
        placeholder="Workspace name…"
        onStartCreate={() => setIsCreating(true)}
        onCreateChange={setNewFolderName}
        onCreateSave={handleCreate}
        onCreateCancel={handleCancelCreate}
      />
    </div>
  );
}
