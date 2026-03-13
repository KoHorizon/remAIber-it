import { useState, useRef } from "react";
import { useLibrary } from "../../context/LibraryContext";
import {
  CreateBankModal,
  DeleteConfirmModal,
  MoveCategoryModal,
  ImportResultModal,
} from "../modals";
import type { DeleteModalData } from "../modals";
import type { Category, Folder, Bank, ImportResult } from "../../types";

import { useLibraryFilters } from "./useLibraryFilters";
import { LibraryHeader } from "./LibraryHeader";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { LibraryFilters } from "./LibraryFilters";
import { CategoryChips } from "./CategoryChips";
import { LibraryTable } from "./LibraryTable";
import { LibraryEmpty } from "./LibraryEmpty";
import "../CategoriesList.css";

type Props = {
  onSelectBank: (bankId: string) => void;
};

export function Library({ onSelectBank }: Props) {
  const {
    folders,
    categories,
    banks,
    isLoading,
    selectedFolderId,
    selectedCategoryId,
    hasFolders,
    visibleCategories,
    getCategoryName,
    selectFolder,
    selectCategory,
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
  } = useLibrary();

  // Filters hook
  const filters = useLibraryFilters({
    banks,
    categories,
    selectedFolderId,
    selectedCategoryId,
    getCategoryName,
  });

  // Modal states
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

  // Folder handlers
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

  // Category handlers
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

  // Bank handlers
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

  const hasContent = categories.length > 0 || banks.length > 0;

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
      <LibraryHeader
        bankCount={filters.filteredAndSortedBanks.length}
        isImporting={isImporting}
        isExporting={isExporting}
        hasContent={hasContent}
        onImport={handleImportClick}
        onExport={handleExport}
      />

      {/* Workspace Tabs */}
      <WorkspaceTabs
        folders={folders}
        selectedFolderId={selectedFolderId}
        editingFolderId={editingFolderId}
        editFolderName={editFolderName}
        onSelectFolder={selectFolder}
        onStartEdit={startEditFolder}
        onEditNameChange={setEditFolderName}
        onSaveEdit={handleUpdateFolder}
        onCancelEdit={() => setEditingFolderId(null)}
        onDelete={openDeleteFolderModal}
        onCreateFolder={async (name) => {
          await createFolder(name);
        }}
      />

      {/* Filters */}
      <LibraryFilters
        searchQuery={filters.searchQuery}
        filterType={filters.filterType}
        hasActiveFilters={filters.hasActiveFilters}
        canCreateBank={visibleCategories.length > 0}
        onSearchChange={filters.setSearchQuery}
        onTypeChange={filters.setFilterType}
        onClearFilters={filters.clearFilters}
        onCreateBank={() =>
          setShowCreateBank(selectedCategoryId || visibleCategories[0]?.id || null)
        }
      />

      {/* Category Chips */}
      <CategoryChips
        categories={visibleCategories}
        banks={banks}
        filterCategory={selectedCategoryId}
        editingCategoryId={editingCategoryId}
        editCategoryName={editCategoryName}
        hasFolders={hasFolders}
        onFilterChange={selectCategory}
        onStartEdit={startEditCategory}
        onEditNameChange={setEditCategoryName}
        onSaveEdit={handleUpdateCategory}
        onCancelEdit={() => setEditingCategoryId(null)}
        onMove={setMovingCategory}
        onDelete={openDeleteCategoryModal}
        onCreateCategory={async (name) => {
          const category = await createCategory(name, selectedFolderId || undefined);
          selectCategory(category.id);
        }}
      />

      {/* Table or Empty State */}
      {hasContent ? (
        <LibraryTable
          banks={filters.filteredAndSortedBanks}
          sortField={filters.sortField}
          sortDirection={filters.sortDirection}
          hasActiveFilters={filters.hasActiveFilters}
          totalBanksInCategory={
            selectedCategoryId
              ? banks.filter((b) => b.category_id === selectedCategoryId).length
              : banks.length
          }
          getCategoryName={getCategoryName}
          onSort={filters.handleSort}
          onSelectBank={onSelectBank}
          onDeleteBank={openDeleteBankModal}
          onClearFilters={filters.clearFilters}
        />
      ) : (
        <LibraryEmpty
          onCreateCategory={async (name) => {
            const category = await createCategory(name, selectedFolderId || undefined);
            selectCategory(category.id);
          }}
        />
      )}
    </div>
  );
}

// Re-export as CategoriesList for backward compatibility
export { Library as CategoriesList };
