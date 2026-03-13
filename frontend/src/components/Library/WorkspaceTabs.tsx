import { useState } from "react";
import type { Folder } from "../../types";
import { Chip, AddChip, ChipIcons } from "../ui";

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

  function handleCancel() {
    setNewFolderName("");
    setIsCreating(false);
  }

  return (
    <div className="library-workspace-chips">
      <Chip
        label="All"
        isActive={!selectedFolderId}
        onClick={() => onSelectFolder(null)}
      />

      {folders.map((folder) => (
        <Chip
          key={folder.id}
          label={folder.name}
          isActive={selectedFolderId === folder.id}
          onClick={() =>
            onSelectFolder(selectedFolderId === folder.id ? null : folder.id)
          }
          isEditing={editingFolderId === folder.id}
          editValue={editFolderName}
          onEditChange={onEditNameChange}
          onEditSave={() => onSaveEdit(folder.id)}
          onEditCancel={onCancelEdit}
          actions={[
            {
              icon: ChipIcons.edit,
              label: "Rename",
              onClick: () => onStartEdit(folder),
            },
            {
              icon: ChipIcons.delete,
              label: "Delete",
              onClick: () => onDelete(folder),
              variant: "danger",
            },
          ]}
        />
      ))}

      <AddChip
        label="+ Workspace"
        isCreating={isCreating}
        createValue={newFolderName}
        placeholder="Workspace name..."
        onStartCreate={() => setIsCreating(true)}
        onCreateChange={setNewFolderName}
        onCreateSave={handleCreate}
        onCreateCancel={handleCancel}
      />
    </div>
  );
}
