import { useState, useRef } from "react";
import type { Category, Bank } from "../../types";
import { getMasteryLevel } from "../../utils/mastery";
import { Chip, AddChip, ChipIcons } from "../ui";

type Props = {
  categories: Category[];
  banks: Bank[];
  filterCategory: string | null;
  editingCategoryId: string | null;
  editCategoryName: string;
  hasFolders: boolean;
  onFilterChange: (categoryId: string | null) => void;
  onStartEdit: (category: Category) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onMove: (category: Category) => void;
  onDelete: (category: Category) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onReorder: (ids: string[]) => void;
};

export function CategoryChips({
  categories,
  banks,
  filterCategory,
  editingCategoryId,
  editCategoryName,
  hasFolders,
  onFilterChange,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onMove,
  onDelete,
  onCreateCategory,
  onReorder,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  async function handleCreate() {
    if (!newCategoryName.trim()) {
      setIsCreating(false);
      return;
    }
    try {
      await onCreateCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create category:", err);
    }
  }

  function handleCancel() {
    setNewCategoryName("");
    setIsCreating(false);
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = "move";
    dragIdRef.current = id;
    // Clear any stale highlight so the source chip never shows as a drop target
    setDragOverId(null);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when the cursor actually leaves this wrapper, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverId(null);
    }
  }

  function handleDrop(targetId: string) {
    setDragOverId(null);
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const ids = categories.map((c) => c.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, sourceId);
    onReorder(ids);
  }

  function handleDragEnd() {
    setDragOverId(null);
    dragIdRef.current = null;
  }

  return (
    <div className="library-category-chips">
      {categories.map((category) => {
        const categoryBanks = banks.filter((b) => b.category_id === category.id);
        const masteryLevel = getMasteryLevel(category.mastery);

        const actions = [
          ...(hasFolders
            ? [
                {
                  icon: ChipIcons.move,
                  label: "Move",
                  onClick: () => onMove(category),
                },
              ]
            : []),
          {
            icon: ChipIcons.edit,
            label: "Rename",
            onClick: () => onStartEdit(category),
          },
          {
            icon: ChipIcons.delete,
            label: "Delete",
            onClick: () => onDelete(category),
            variant: "danger" as const,
          },
        ];

        return (
          <div
            key={category.id}
            draggable
            onDragStart={(e) => handleDragStart(e, category.id)}
            onDragOver={(e) => handleDragOver(e, category.id)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(category.id)}
            onDragEnd={handleDragEnd}
            className={`category-chip-drag-wrapper${dragOverId === category.id ? " drop-target" : ""}`}
          >
            <Chip
              label={category.name}
              isActive={filterCategory === category.id}
              onClick={() =>
                onFilterChange(filterCategory === category.id ? null : category.id)
              }
              badges={categoryBanks.length > 0 ? [
                { content: `${category.mastery}%`, className: masteryLevel },
                { content: categoryBanks.length },
              ] : []}
              actions={actions}
              isEditing={editingCategoryId === category.id}
              editValue={editCategoryName}
              onEditChange={onEditNameChange}
              onEditSave={() => onSaveEdit(category.id)}
              onEditCancel={onCancelEdit}
            />
          </div>
        );
      })}

      <AddChip
        label="+ Category"
        isCreating={isCreating}
        createValue={newCategoryName}
        placeholder="Category name..."
        onStartCreate={() => setIsCreating(true)}
        onCreateChange={setNewCategoryName}
        onCreateSave={handleCreate}
        onCreateCancel={handleCancel}
      />
    </div>
  );
}
