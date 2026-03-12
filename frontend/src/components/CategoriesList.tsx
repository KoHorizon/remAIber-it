import { useState, useRef } from "react";
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

function getMasteryLevel(mastery: number): string {
  if (mastery >= 80) return "excellent";
  if (mastery >= 60) return "good";
  if (mastery >= 40) return "fair";
  if (mastery > 0) return "needs-work";
  return "none";
}

function getBankTypeInfo(bank: Bank) {
  if (bank.bank_type === "code") {
    return { icon: "code", label: bank.language || "Code", className: "type-code" };
  }
  if (bank.bank_type === "cli") {
    return { icon: "terminal", label: "CLI", className: "type-cli" };
  }
  return { icon: "book", label: "Theory", className: "type-theory" };
}

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
  } = useLibraryData();

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter by search
  const filteredCategories = searchQuery
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : visibleCategories;

  const filteredBanks = searchQuery
    ? banks.filter((b) =>
        b.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

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

  // Calculate mastery ring
  function getMasteryRing(mastery: number) {
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (mastery / 100) * circumference;
    return { circumference, offset };
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  const hasContent = categories.length > 0 || banks.length > 0;

  return (
    <div className="library animate-fade-in">
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
      <div className="library-header">
        <div className="library-header-left">
          <h1 className="library-title">Library</h1>
        </div>
        <div className="library-header-actions">
          <button
            className="btn btn-ghost"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isImporting ? "Importing..." : "Import"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleExport}
            disabled={isExporting || !hasContent}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isExporting ? "Exporting..." : "Export"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateCategory(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Category
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="library-search">
        <div className="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input"
            placeholder="Search categories and banks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Workspace Tabs (Folders) */}
      {(hasFolders || folders.length > 0) && !searchQuery && (
        <div className="workspace-tabs">
          <button
            className={`workspace-tab ${!selectedFolderId ? "active" : ""}`}
            onClick={() => setSelectedFolderId(null)}
          >
            All
          </button>
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`workspace-tab ${selectedFolderId === folder.id ? "active" : ""}`}
            >
              {editingFolderId === folder.id ? (
                <input
                  type="text"
                  className="workspace-tab-input"
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
                    className="workspace-tab-btn"
                    onClick={() =>
                      setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)
                    }
                  >
                    {folder.name}
                  </button>
                  <div className="workspace-tab-actions">
                    <button
                      className="workspace-tab-action"
                      onClick={(e) => startEditFolder(e, folder)}
                      title="Rename"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="workspace-tab-action danger"
                      onClick={(e) => openDeleteFolderModal(e, folder)}
                      title="Delete"
                    >
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
            className="workspace-tab workspace-tab-add"
            onClick={() => setShowCreateFolder(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Workspace
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="search-results">
          {filteredCategories.length > 0 && (
            <div className="search-section">
              <h3 className="search-section-title">Categories</h3>
              <div className="category-grid">
                {filteredCategories.map((category) => {
                  const categoryBanks = getBanksForCategory(category.id);
                  const { circumference, offset } = getMasteryRing(category.mastery);
                  return (
                    <div
                      key={category.id}
                      className="category-card"
                      onClick={() => {
                        setSearchQuery("");
                        toggleCategory(category.id);
                      }}
                    >
                      <div className="category-card-header">
                        <div className="category-card-mastery">
                          <svg width="44" height="44" viewBox="0 0 44 44">
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              fill="none"
                              stroke="var(--bg-elevated)"
                              strokeWidth="4"
                            />
                            <circle
                              cx="22"
                              cy="22"
                              r="18"
                              fill="none"
                              className={`mastery-ring-stroke ${getMasteryLevel(category.mastery)}`}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              transform="rotate(-90 22 22)"
                            />
                          </svg>
                          <span className="category-card-mastery-value">{category.mastery}%</span>
                        </div>
                        <div className="category-card-info">
                          <h3 className="category-card-name">{category.name}</h3>
                          <span className="category-card-count">
                            {categoryBanks.length} bank{categoryBanks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredBanks.length > 0 && (
            <div className="search-section">
              <h3 className="search-section-title">Banks</h3>
              <div className="bank-grid">
                {filteredBanks.map((bank) => {
                  const typeInfo = getBankTypeInfo(bank);
                  return (
                    <div
                      key={bank.id}
                      className="bank-card"
                      onClick={() => onSelectBank(bank.id)}
                    >
                      <div className="bank-card-header">
                        <span className={`bank-card-type ${typeInfo.className}`}>
                          {typeInfo.label}
                        </span>
                        <span className={`bank-card-mastery ${getMasteryLevel(bank.mastery)}`}>
                          {bank.mastery}%
                        </span>
                      </div>
                      <h4 className="bank-card-name">{bank.subject}</h4>
                      <span className="bank-card-questions">
                        {bank.questions?.length || 0} questions
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCategories.length === 0 && filteredBanks.length === 0 && (
            <div className="search-empty">
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Categories Grid (not searching) */}
      {!searchQuery && (
        <div className="category-grid">
          {filteredCategories.map((category) => {
            const categoryBanks = getBanksForCategory(category.id);
            const isExpanded = expandedCategories.has(category.id);
            const isEditing = editingCategoryId === category.id;
            const { circumference, offset } = getMasteryRing(category.mastery);

            return (
              <div key={category.id} className="category-card-wrapper">
                <div
                  className={`category-card ${isExpanded ? "expanded" : ""}`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="category-card-header">
                    <div className="category-card-mastery">
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="var(--bg-elevated)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          className={`mastery-ring-stroke ${getMasteryLevel(category.mastery)}`}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          transform="rotate(-90 22 22)"
                        />
                      </svg>
                      <span className="category-card-mastery-value">{category.mastery}%</span>
                    </div>
                    <div className="category-card-info">
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
                        <h3 className="category-card-name">{category.name}</h3>
                      )}
                      <span className="category-card-count">
                        {categoryBanks.length} bank{categoryBanks.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="category-card-actions">
                    {hasFolders && (
                      <button
                        className="category-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMovingCategory(category);
                        }}
                        title="Move to workspace"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="category-action-btn"
                      onClick={(e) => startEditCategory(e, category)}
                      title="Edit"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="category-action-btn danger"
                      onClick={(e) => openDeleteCategoryModal(e, category)}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div className="category-card-expand">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={isExpanded ? "rotated" : ""}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Banks */}
                {isExpanded && (
                  <div className="category-banks">
                    {categoryBanks.map((bank) => {
                      const typeInfo = getBankTypeInfo(bank);
                      return (
                        <div
                          key={bank.id}
                          className="bank-card"
                          onClick={() => onSelectBank(bank.id)}
                        >
                          <div className="bank-card-header">
                            <span className={`bank-card-type ${typeInfo.className}`}>
                              {typeInfo.label}
                            </span>
                            <span className={`bank-card-mastery ${getMasteryLevel(bank.mastery)}`}>
                              {bank.mastery}%
                            </span>
                          </div>
                          <h4 className="bank-card-name">{bank.subject}</h4>
                          <span className="bank-card-questions">
                            {bank.questions?.length || 0} questions
                          </span>
                          <button
                            className="bank-card-delete"
                            onClick={(e) => openDeleteBankModal(e, bank)}
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                    <button
                      className="add-bank-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreateBank(category.id);
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Add Bank</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Uncategorized Banks */}
      {!searchQuery && uncategorizedBanks.length > 0 && (
        <div className="uncategorized-section">
          <h3 className="section-title">Uncategorized</h3>
          <div className="bank-grid">
            {uncategorizedBanks.map((bank) => {
              const typeInfo = getBankTypeInfo(bank);
              return (
                <div
                  key={bank.id}
                  className="bank-card"
                  onClick={() => onSelectBank(bank.id)}
                >
                  <div className="bank-card-header">
                    <span className={`bank-card-type ${typeInfo.className}`}>
                      {typeInfo.label}
                    </span>
                    <span className={`bank-card-mastery ${getMasteryLevel(bank.mastery)}`}>
                      {bank.mastery}%
                    </span>
                  </div>
                  <h4 className="bank-card-name">{bank.subject}</h4>
                  <span className="bank-card-questions">
                    {bank.questions?.length || 0} questions
                  </span>
                  <button
                    className="bank-card-delete"
                    onClick={(e) => openDeleteBankModal(e, bank)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasContent && !searchQuery && (
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
            className="btn btn-primary btn-lg"
            onClick={() => setShowCreateCategory(true)}
          >
            Create Category
          </button>
        </div>
      )}
    </div>
  );
}
