import { useState, useRef } from "react";
import { useLibraryData } from "../hooks/useLibraryData";
import { getMasteryColor, getBankTypeBadge } from "../utils/mastery";
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

export function CategoriesList({ onSelectBank }: Props) {
  const {
    folders,
    categories,
    banks,
    isLoading,
    selectedFolderId,
    setSelectedFolderId,
    expandedCategories,
    hasFolders,
    toggleCategory,
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
    getVisibleCategories,
    getBanksForCategory,
    uncategorizedBanks,
    selectedFolder,
  } = useLibraryData();

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

  const visibleCategories = getVisibleCategories();

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

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="categories-list animate-fade-in">
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

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Your Learning Library</h1>
            <p className="page-subtitle">
              {categories.length === 0 && banks.length === 0
                ? "Create categories to organize your question banks"
                : `${folders.length > 0 ? `${folders.length} folder${folders.length !== 1 ? "s" : ""}, ` : ""}${categories.length} categor${categories.length !== 1 ? "ies" : "y"}, ${banks.length} bank${banks.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-ghost"
              onClick={handleImportClick}
              disabled={isImporting}
              title="Import from file"
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleExport}
              disabled={isExporting || (categories.length === 0 && banks.length === 0)}
              title="Export all data"
            >
              {isExporting ? "Exporting..." : "Export"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreateCategory(true)}
            >
              + Category
            </button>
          </div>
        </div>
      </div>

      {/* Folders Bar */}
      <div className="folders-bar">
        <div className="folders-scroll">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`folder-card ${selectedFolderId === folder.id ? "folder-card-active" : ""}`}
              onClick={() =>
                setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)
              }
            >
              {editingFolderId === folder.id ? (
                <input
                  type="text"
                  className="input folder-edit-input"
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
                  <div className="folder-card-top">
                    <span className="folder-icon">📁</span>
                    <div className="folder-card-actions">
                      <button
                        className="folder-action-btn"
                        onClick={(e) => startEditFolder(e, folder)}
                        title="Rename folder"
                      >
                        ✎
                      </button>
                      <button
                        className="folder-action-btn folder-action-danger"
                        onClick={(e) => openDeleteFolderModal(e, folder)}
                        title="Delete folder"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <span className="folder-name">{folder.name}</span>
                  <div className="folder-meta">
                    <span className={`folder-mastery ${getMasteryColor(folder.mastery)}`}>
                      {folder.mastery}%
                    </span>
                    <span className="folder-cat-count">
                      {categories.filter((c) => c.folder_id === folder.id).length} cat.
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Add Folder Button */}
          <button
            className="folder-card folder-card-add"
            onClick={() => setShowCreateFolder(true)}
          >
            <span className="folder-add-icon">+</span>
            <span className="folder-add-label">New Folder</span>
          </button>
        </div>
      </div>

      {/* Folder context indicator */}
      {hasFolders && selectedFolder && (
        <div className="folder-context-bar">
          <div className="folder-context-info">
            <span className="folder-context-icon">📁</span>
            <span className="folder-context-name">{selectedFolder.name}</span>
            <span className="folder-context-count">
              {visibleCategories.length} categor
              {visibleCategories.length !== 1 ? "ies" : "y"}
            </span>
            <button
              className="btn btn-ghost folder-context-clear"
              onClick={() => setSelectedFolderId(null)}
            >
              Show Unfiled
            </button>
          </div>
        </div>
      )}
      {hasFolders && !selectedFolderId && visibleCategories.length > 0 && (
        <div className="folder-context-bar">
          <div className="folder-context-info">
            <span className="folder-context-icon">📋</span>
            <span className="folder-context-name">Unfiled Categories</span>
            <span className="folder-context-count">
              {visibleCategories.length} categor
              {visibleCategories.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="categories-section">
        {visibleCategories.map((category, i) => {
          const categoryBanks = getBanksForCategory(category.id);
          const isExpanded = expandedCategories.has(category.id);
          const isEditing = editingCategoryId === category.id;

          return (
            <div
              key={category.id}
              className="category-item"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div
                className="category-header card card-interactive"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="category-expand">
                  <span className={`expand-icon ${isExpanded ? "expanded" : ""}`}>
                    ▶
                  </span>
                </div>
                <div className="category-info">
                  {isEditing ? (
                    <input
                      type="text"
                      className="input category-edit-input"
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
                    <h2 className="category-name">{category.name}</h2>
                  )}
                  <span className="category-count">
                    {categoryBanks.length} bank{categoryBanks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="category-mastery">
                  <div className={`mastery-badge ${getMasteryColor(category.mastery)}`}>
                    <span className="mastery-value">{category.mastery}%</span>
                    <span className="mastery-label">mastery</span>
                  </div>
                </div>
                <div className="category-actions">
                  {hasFolders && (
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovingCategory(category);
                      }}
                      title="Move to folder"
                    >
                      ↗
                    </button>
                  )}
                  <button
                    className="btn-icon"
                    onClick={(e) => startEditCategory(e, category)}
                    title="Edit category"
                  >
                    &#9998;
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={(e) => openDeleteCategoryModal(e, category)}
                    title="Delete category"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="category-banks">
                  {categoryBanks.map((bank) => {
                    const typeBadge = getBankTypeBadge(bank);
                    return (
                      <div
                        key={bank.id}
                        className="bank-card card card-interactive"
                        onClick={() => onSelectBank(bank.id)}
                      >
                        <div className="bank-card-header">
                          <span className="bank-name">{bank.subject}</span>
                        </div>
                        <div className="bank-card-footer">
                          <div className={`mastery-pill ${getMasteryColor(bank.mastery)}`}>
                            {bank.mastery}% mastery
                          </div>
                          <span className={`bank-type-badge ${typeBadge.className}`}>
                            <span className="badge-icon">{typeBadge.icon}</span>
                            <span className="badge-label">{typeBadge.label}</span>
                          </span>
                        </div>
                        <button
                          className="btn-delete"
                          onClick={(e) => openDeleteBankModal(e, bank)}
                          title="Delete bank"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                  <button
                    className="add-bank-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateBank(category.id);
                    }}
                  >
                    <span className="add-bank-icon">+</span>
                    <span>Add Bank</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Uncategorized Banks */}
      {uncategorizedBanks.length > 0 && (
        <div className="uncategorized-section">
          <h2 className="section-title">Uncategorized</h2>
          <div className="uncategorized-banks">
            {uncategorizedBanks.map((bank) => {
              const typeBadge = getBankTypeBadge(bank);
              return (
                <div
                  key={bank.id}
                  className="bank-card card card-interactive"
                  onClick={() => onSelectBank(bank.id)}
                >
                  <div className="bank-card-header">
                    <span className="bank-name">{bank.subject}</span>
                  </div>
                  <div className="bank-card-footer">
                    <div className={`mastery-pill ${getMasteryColor(bank.mastery)}`}>
                      {bank.mastery}% mastery
                    </div>
                    <span className={`bank-type-badge ${typeBadge.className}`}>
                      <span className="badge-icon">{typeBadge.icon}</span>
                      <span className="badge-label">{typeBadge.label}</span>
                    </span>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={(e) => openDeleteBankModal(e, bank)}
                    title="Delete bank"
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {categories.length === 0 && banks.length === 0 && folders.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <p className="empty-state-text">
            Start by creating a folder to group your categories, or create a
            category directly to begin adding question banks.
          </p>
        </div>
      )}

      {/* Empty folder state */}
      {visibleCategories.length === 0 && (categories.length > 0 || banks.length > 0) && (
        <div className="empty-state" style={{ padding: "2rem" }}>
          <p className="empty-state-text">
            {selectedFolderId
              ? "No categories in this folder yet. Create one or move an existing category here."
              : "No unfiled categories. Select a folder above or create a new category."}
          </p>
        </div>
      )}
    </div>
  );
}
