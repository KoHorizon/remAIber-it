import type { Category, Bank } from "../../types";
import { getMasteryLevel } from "../../utils/mastery";

type Props = {
  categories: Category[];
  banks: Bank[];
  filterCategory: string | null;
  editingCategoryId: string | null;
  editCategoryName: string;
  hasFolders: boolean;
  onFilterChange: (categoryId: string | null) => void;
  onStartEdit: (e: React.MouseEvent, category: Category) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onMove: (category: Category) => void;
  onDelete: (e: React.MouseEvent, category: Category) => void;
  onCreateCategory: () => void;
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
  if (categories.length === 0) return null;

  return (
    <div className="library-category-chips">
      {categories.map((category) => {
        const categoryBanks = banks.filter((b) => b.category_id === category.id);
        const isEditing = editingCategoryId === category.id;

        return (
          <div
            key={category.id}
            className={`category-chip ${filterCategory === category.id ? "active" : ""}`}
            onClick={() =>
              onFilterChange(filterCategory === category.id ? null : category.id)
            }
          >
            {isEditing ? (
              <input
                type="text"
                className="chip-edit-input"
                value={editCategoryName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEdit(category.id);
                  else if (e.key === "Escape") onCancelEdit();
                }}
                onBlur={() => onSaveEdit(category.id)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <>
                <span className="chip-name">{category.name}</span>
                <span className={`chip-mastery ${getMasteryLevel(category.mastery)}`}>
                  {category.mastery}%
                </span>
                <span className="chip-count">{categoryBanks.length}</span>
                <div className="chip-actions">
                  {hasFolders && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(category);
                      }}
                      title="Move"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  )}
                  <button onClick={(e) => onStartEdit(e, category)} title="Rename">
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
                    onClick={(e) => onDelete(e, category)}
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
      <button className="category-chip add-chip" onClick={onCreateCategory}>
        + Add Category
      </button>
    </div>
  );
}
