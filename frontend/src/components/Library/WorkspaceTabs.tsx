import type { Folder } from "../../types";
import { Tabs, ChipIcons } from "../ui";
import type { TabItem } from "../ui";

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

// Reserved id for the "All" tab
const ALL_ID = "__all__";

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
  const tabs: TabItem[] = [
    { id: ALL_ID, label: "All" },
    ...folders.map((folder) => ({
      id: folder.id,
      label: folder.name,
      actions: [
        {
          icon: ChipIcons.edit,
          label: "Rename",
          onClick: () => onStartEdit(folder),
        },
        {
          icon: ChipIcons.delete,
          label: "Delete",
          onClick: () => onDelete(folder),
          variant: "danger" as const,
        },
      ],
    })),
  ];

  function handleSelect(id: string | null) {
    if (id === ALL_ID || id === null) {
      onSelectFolder(null);
    } else {
      onSelectFolder(id);
    }
  }

  return (
    <Tabs
      tabs={tabs}
      activeId={selectedFolderId ?? ALL_ID}
      onSelect={handleSelect}
      editingId={editingFolderId}
      editValue={editFolderName}
      onEditChange={onEditNameChange}
      onEditSave={onSaveEdit}
      onEditCancel={onCancelEdit}
      addLabel="+ Workspace"
      addPlaceholder="Workspace name…"
      onAdd={onCreateFolder}
    />
  );
}
