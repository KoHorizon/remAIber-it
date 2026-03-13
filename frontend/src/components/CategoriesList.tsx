import { useState, useRef, useMemo } from "react";
import { useLibraryData } from "../hooks/useLibraryData";
import {
  CreateFolderModal,
  CreateCategoryModal,
  CreateBankModal,
  DeleteConfirmModal,
  MoveCategoryModal,
  ImportResultModal,
} from "./modals";
import type { DeleteModalData } from "./modals";
import type { Folder, Category, Bank, ImportResult } from "../types";
import "./CategoriesList.css";

type Props = {
  onSelectBank: (bankId: string) => void;
};

type SortField = "name" | "category" | "type" | "mastery" | "questions";
type SortDirection = "asc" | "desc";

function getMasteryLevel(mastery: number): string {
  if (mastery >= 80) return "excellent";
  if (mastery >= 60) return "good";
  if (mastery >= 40) return "fair";
  if (mastery > 0) return "needs-work";
  return "none";
}

function getBankTypeLabel(bank: Bank): string {
  if (bank.bank_type === "code") return bank.language || "Code";
  if (bank.bank_type === "cli") return "CLI";
  return "Theory";
}

function getBankTypeClass(bank: Bank): string {
  if (bank.bank_type === "code") return "type-code";
  if (bank.bank_type === "cli") return "type-cli";
  return "type-theory";
}

export function CategoriesList({ onSelectBank }: Props) {
  const {
    folders,
    categories,
    banks,
    isLoading,
    selectedFolderId,
    setSelectedFolderId,
    hasFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    createCategory,
    updateCategory,
    moveCategory,
    deleteCategory,
    createBank,
    deleteBank,
    exportData,
    importData,
    uncategorizedBanks,
  } = useLibraryData();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Sort
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Modal states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateBank, setShowCreateBank] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalData | null>(null);
  const [movingCategory, setMovingCategory] = useState<Category | null>(null);

  // Edit states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  // Import/Export state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get category name by ID
  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "Uncategorized";
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || "Unknown";
  };

  // Filter and sort banks
  const filteredAndSortedBanks = useMemo(() => {
    let result = [...banks];

    // Filter by folder (workspace)
    if (selectedFolderId) {
      const folderCategoryIds = categories
        .filter(c => c.folder_id === selectedFolderId)
        .map(c => c.id);
      result = result.filter(b => b.category_id && folderCategoryIds.includes(b.category_id));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.subject.toLowerCase().includes(query) ||
        getCategoryName(b.category_id).toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (filterCategory) {
      if (filterCategory === "uncategorized") {
        result = result.filter(b => !b.category_id);
      } else {
        result = result.filter(b => b.category_id === filterCategory);
      }
    }

    // Filter by type
    if (filterType) {
      result = result.filter(b => b.bank_type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.subject.localeCompare(b.subject);
          break;
        case "category":
          comparison = getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id));
          break;
        case "type":
          comparison = (a.bank_type || "theory").localeCompare(b.bank_type || "theory");
          break;
        case "mastery":
          comparison = a.mastery - b.mastery;
          break;
        case "questions":
          comparison = (a.questions?.length || 0) - (b.questions?.length || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [banks, categories, selectedFolderId, searchQuery, filterCategory, filterType, sortField, sortDirection]);

  // Handle sort click
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // Folder operations
  function startEditFolder(e: React.MouseEvent, folder: Folder) {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  }

  async function handleUpdateFolder(folderId: string) {
    if (!editFolderName.trim()) return;
    try {
      await updateFolder(folderId, editFolderName.trim());
      setEditingFolderId(null);
      setEditFolderName("");
    } catch (err: unknown) {
      console.error("Failed to update folder:", err);
    }
  }

  function openDeleteFolderModal(e: React.MouseEvent, folder: Folder) {
    e.stopPropagation();
    const folderCategories = categories.filter((c) => c.folder_id === folder.id);
    setDeleteModal({
      type: "folder",
      id: folder.id,
      name: folder.name,
      categoryCount: folderCategories.length,
    });
  }

  // Category operations
  function startEditCategory(e: React.MouseEvent, category: Category) {
    e.stopPropagation();
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  }

  async function handleUpdateCategory(categoryId: string) {
    if (!editCategoryName.trim()) return;
    try {
      await updateCategory(categoryId, editCategoryName.trim());
      setEditingCategoryId(null);
      setEditCategoryName("");
    } catch (err: unknown) {
      console.error("Failed to update category:", err);
    }
  }

  function openDeleteCategoryModal(e: React.MouseEvent, category: Category) {
    e.stopPropagation();
    const categoryBanks = banks.filter((b) => b.category_id === category.id);
    setDeleteModal({
      type: "category",
      id: category.id,
      name: category.name,
      bankCount: categoryBanks.length,
    });
  }

  function openDeleteBankModal(e: React.MouseEvent, bank: Bank) {
    e.stopPropagation();
    setDeleteModal({
      type: "bank",
      id: bank.id,
      name: bank.subject,
    });
  }

  async function handleDelete(id: string, type: DeleteModalData["type"]) {
    if (type === "folder") {
      await deleteFolder(id);
    } else if (type === "category") {
      await deleteCategory(id);
    } else {
      await deleteBank(id);
    }
  }

  // Export/Import handlers
  async function handleExport() {
    setIsExporting(true);
    try {
      await exportData();
    } catch (err: unknown) {
      console.error("Failed to export:", err);
    } finally {
      setIsExporting(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importData(file);
      setImportResult(result);
    } catch (err: unknown) {
      console.error("Failed to import:", err);
      alert("Failed to import file. Please check the file format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Clear all filters
  function clearFilters() {
    setSearchQuery("");
    setFilterCategory(null);
    setFilterType(null);
  }

  const hasActiveFilters = searchQuery || filterCategory || filterType;

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const hasContent = categories.length > 0 || banks.length > 0;

  // Get visible categories based on selected folder
  const visibleCategories = selectedFolderId
    ? categories.filter(c => c.folder_id === selectedFolderId)
    : categories;

  return (
    <div className="library-table animate-fade-in">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        style={{ display: "none" }}
      />

      {/* Modals */}
      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onCreate={async (name) => {
            await createFolder(name);
          }}
        />
      )}

      {showCreateCategory && (
        <CreateCategoryModal
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onClose={() => setShowCreateCategory(false)}
          onCreate={async (name, folderId) => {
            await createCategory(name, folderId);
          }}
        />
      )}

      {showCreateBank && (
        <CreateBankModal
          categoryId={showCreateBank}
          onClose={() => setShowCreateBank(null)}
          onCreate={async (subject, categoryId, bankType, language) => {
            await createBank(subject, categoryId, bankType, language);
          }}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          data={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
        />
      )}

      {movingCategory && (
        <MoveCategoryModal
          category={movingCategory}
          folders={folders}
          onClose={() => setMovingCategory(null)}
          onMove={async (categoryId, folderId) => {
            await moveCategory(categoryId, folderId);
          }}
        />
      )}

      {/* Header */}
      <div className="library-table-header">
        <div className="library-table-title">
          <h1>Library</h1>
          <span className="library-table-count">{filteredAndSortedBanks.length} banks</span>
        </div>
        <div className="library-table-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
            disabled={isExporting || !hasContent}
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateBank(filterCategory || visibleCategories[0]?.id || null)}
            disabled={categories.length === 0}
          >
            + Bank
          </button>
        </div>
      </div>

      {/* Workspace Tabs */}
      {(hasFolders || folders.length > 0) && (
        <div className="library-table-tabs">
          <button
            className={`tab-btn ${!selectedFolderId ? "active" : ""}`}
            onClick={() => setSelectedFolderId(null)}
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
                  onChange={(e) => setEditFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateFolder(folder.id);
                    else if (e.key === "Escape") setEditingFolderId(null);
                  }}
                  onBlur={() => handleUpdateFolder(folder.id)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <button
                    className="tab-btn-inner"
                    onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                  >
                    {folder.name}
                  </button>
                  <div className="tab-actions">
                    <button onClick={(e) => startEditFolder(e, folder)} title="Rename">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={(e) => openDeleteFolderModal(e, folder)} title="Delete" className="danger">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            className="tab-btn tab-btn-add"
            onClick={() => setShowCreateFolder(true)}
          >
            + Workspace
          </button>
        </div>
      )}

      {/* Filters Row */}
      <div className="library-table-filters">
        <div className="filter-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search banks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-dropdowns">
          <select
            value={filterType || ""}
            onChange={(e) => setFilterType(e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="theory">Theory</option>
            <option value="code">Code</option>
            <option value="cli">CLI</option>
          </select>

          {hasActiveFilters && (
            <button className="filter-clear" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Category Chips - for filtering */}
      {categories.length > 0 && (
        <div className="library-category-chips">
          {visibleCategories.map(category => {
            const categoryBanks = banks.filter(b => b.category_id === category.id);
            const isEditing = editingCategoryId === category.id;

            return (
              <div
                key={category.id}
                className={`category-chip ${filterCategory === category.id ? 'active' : ''}`}
                onClick={() => setFilterCategory(filterCategory === category.id ? null : category.id)}
              >
                {isEditing ? (
                  <input
                    type="text"
                    className="chip-edit-input"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateCategory(category.id);
                      else if (e.key === "Escape") setEditingCategoryId(null);
                    }}
                    onBlur={() => handleUpdateCategory(category.id)}
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
                            setMovingCategory(category);
                          }}
                          title="Move"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      )}
                      <button onClick={(e) => startEditCategory(e, category)} title="Rename">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => openDeleteCategoryModal(e, category)}
                        title="Delete"
                        className="danger"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <button
            className="category-chip add-chip"
            onClick={() => setShowCreateCategory(true)}
          >
            + Add Category
          </button>
        </div>
      )}

      {/* Table */}
      {hasContent ? (
        <div className="library-table-wrapper">
          <table className="library-table-content">
            <thead>
              <tr>
                <th className="col-name" onClick={() => handleSort("name")}>
                  Name
                  <SortIcon field="name" current={sortField} direction={sortDirection} />
                </th>
                <th className="col-category" onClick={() => handleSort("category")}>
                  Category
                  <SortIcon field="category" current={sortField} direction={sortDirection} />
                </th>
                <th className="col-type" onClick={() => handleSort("type")}>
                  Type
                  <SortIcon field="type" current={sortField} direction={sortDirection} />
                </th>
                <th className="col-mastery" onClick={() => handleSort("mastery")}>
                  Mastery
                  <SortIcon field="mastery" current={sortField} direction={sortDirection} />
                </th>
                <th className="col-questions" onClick={() => handleSort("questions")}>
                  Questions
                  <SortIcon field="questions" current={sortField} direction={sortDirection} />
                </th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBanks.map((bank) => (
                <tr key={bank.id} onClick={() => onSelectBank(bank.id)}>
                  <td className="col-name">
                    <span className="bank-name">{bank.subject}</span>
                  </td>
                  <td className="col-category">
                    <span className="category-badge">
                      {getCategoryName(bank.category_id)}
                    </span>
                  </td>
                  <td className="col-type">
                    <span className={`type-badge ${getBankTypeClass(bank)}`}>
                      {getBankTypeLabel(bank)}
                    </span>
                  </td>
                  <td className="col-mastery">
                    <div className="mastery-cell">
                      <div className="mastery-bar">
                        <div
                          className={`mastery-fill ${getMasteryLevel(bank.mastery)}`}
                          style={{ width: `${bank.mastery}%` }}
                        />
                      </div>
                      <span className={`mastery-value ${getMasteryLevel(bank.mastery)}`}>
                        {bank.mastery}%
                      </span>
                    </div>
                  </td>
                  <td className="col-questions">
                    {bank.questions?.length || 0}
                  </td>
                  <td className="col-actions">
                    <button
                      className="row-action-btn danger"
                      onClick={(e) => openDeleteBankModal(e, bank)}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedBanks.length === 0 && hasActiveFilters && (
            <div className="table-empty">
              <p>No banks match your filters.</p>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="library-empty">
          <div className="library-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 className="library-empty-title">Your library is empty</h2>
          <p className="library-empty-text">
            Create your first category to start organizing your question banks.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateCategory(true)}
          >
            Create Category
          </button>
        </div>
      )}

    </div>
  );
}

// Sort icon component
function SortIcon({ field, current, direction }: { field: SortField; current: SortField; direction: SortDirection }) {
  if (field !== current) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sort-icon inactive">
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sort-icon active">
      {direction === "asc" ? <path d="M7 14l5-5 5 5" /> : <path d="M7 10l5 5 5-5" />}
    </svg>
  );
}
