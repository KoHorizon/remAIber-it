import { useState } from "react";
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
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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
          <Chip
            key={category.id}
            label={category.name}
            isActive={filterCategory === category.id}
            onClick={() =>
              onFilterChange(filterCategory === category.id ? null : category.id)
            }
            badges={[
              { content: `${category.mastery}%`, className: masteryLevel },
              { content: categoryBanks.length },
            ]}
            actions={actions}
            isEditing={editingCategoryId === category.id}
            editValue={editCategoryName}
            onEditChange={onEditNameChange}
            onEditSave={() => onSaveEdit(category.id)}
            onEditCancel={onCancelEdit}
          />
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
