import { useState, useEffect, useRef } from "react";
import {
  api,
  Folder,
  Category,
  Bank,
  BankType,
  ExportData,
  ImportResult,
} from "../App";
import "./CategoriesList.css";

type Props = {
  onSelectBank: (bankId: string) => void;
};

export function CategoriesList({ onSelectBank }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Modal states
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBankSubject, setNewBankSubject] = useState("");
  const [newBankCategoryId, setNewBankCategoryId] = useState<
    string | undefined
  >(undefined);
  const [newBankType, setNewBankType] = useState<BankType>("theory");
  const [newBankLanguage, setNewBankLanguage] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    type: "category" | "bank" | "folder";
    id: string;
    name: string;
    bankCount?: number;
    categoryCount?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Move category to folder state
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null);

  // Import/Export state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [foldersData, categoriesData, banksData] = await Promise.all([
        api.getFolders(),
        api.getCategories(),
        api.getBanks(),
      ]);
      setFolders(foldersData || []);
      setCategories(categoriesData || []);
      setBanks(banksData || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  // ── Folder CRUD ─────────────────────────────────────────────────

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const folder = await api.createFolder(newFolderName.trim());
      setFolders([...folders, folder]);
      setNewFolderName("");
      setShowCreateFolder(false);
      setSelectedFolderId(folder.id);
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateFolder(folderId: string) {
    if (!editFolderName.trim()) return;

    try {
      const updated = await api.updateFolder(folderId, editFolderName.trim());
      setFolders(folders.map((f) => (f.id === folderId ? updated : f)));
      setEditingFolderId(null);
      setEditFolderName("");
    } catch (err) {
      console.error("Failed to update folder:", err);
    }
  }

  function openDeleteFolderModal(e: React.MouseEvent, folder: Folder) {
    e.stopPropagation();
    const folderCategories = categories.filter(
      (c) => c.folder_id === folder.id,
    );
    setDeleteModal({
      type: "folder",
      id: folder.id,
      name: folder.name,
      categoryCount: folderCategories.length,
    });
  }

  function selectFolder(folderId: string | null) {
    setSelectedFolderId(folderId);
  }

  // ── Move category to folder ─────────────────────────────────────

  async function handleMoveCategory(
    categoryId: string,
    folderId: string | null,
  ) {
    try {
      const updated = await api.updateCategoryFolder(categoryId, folderId);
      setCategories(categories.map((c) => (c.id === categoryId ? updated : c)));
      setMovingCategoryId(null);
    } catch (err) {
      console.error("Failed to move category:", err);
    }
  }

  // ── Category CRUD ───────────────────────────────────────────────

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      // Create category in the currently selected folder
      const category = await api.createCategory(
        newCategoryName.trim(),
        selectedFolderId || undefined,
      );
      setCategories([...categories, category]);
      setNewCategoryName("");
      setShowCreateCategory(false);
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateCategory(categoryId: string) {
    if (!editCategoryName.trim()) return;

    try {
      const updated = await api.updateCategory(
        categoryId,
        editCategoryName.trim(),
      );
      setCategories(categories.map((c) => (c.id === categoryId ? updated : c)));
      setEditingCategoryId(null);
      setEditCategoryName("");
    } catch (err) {
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

  async function confirmDelete() {
    if (!deleteModal || isDeleting) return;

    setIsDeleting(true);
    try {
      if (deleteModal.type === "folder") {
        const folderId = deleteModal.id;
        await api.deleteFolder(folderId);
        setFolders(folders.filter((f) => f.id !== folderId));
        // Categories become unfiled
        setCategories(
          categories.map((c) =>
            c.folder_id === folderId ? { ...c, folder_id: null } : c,
          ),
        );
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
      } else if (deleteModal.type === "category") {
        const categoryId = deleteModal.id;
        await api.deleteCategory(categoryId);
        setCategories(categories.filter((c) => c.id !== categoryId));
        setBanks((prevBanks) =>
          prevBanks.filter((b) => b.category_id !== categoryId),
        );
      } else {
        const bankId = deleteModal.id;
        await api.deleteBank(bankId);
        setBanks((prevBanks) => prevBanks.filter((b) => b.id !== bankId));
      }
      setDeleteModal(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Bank CRUD ───────────────────────────────────────────────────

  async function handleCreateBank(e: React.FormEvent) {
    e.preventDefault();
    if (!newBankSubject.trim() || !newBankCategoryId || isCreating) return;

    setIsCreating(true);
    try {
      const bank = await api.createBank(
        newBankSubject.trim(),
        newBankCategoryId,
        newBankType,
        newBankType === "code" ? newBankLanguage || undefined : undefined,
      );
      setBanks([...banks, bank]);
      setNewBankSubject("");
      setNewBankCategoryId(undefined);
      setNewBankType("theory");
      setNewBankLanguage("");
      setShowCreateBank(false);
    } catch (err) {
      console.error("Failed to create bank:", err);
    } finally {
      setIsCreating(false);
    }
  }

  function openCreateBankForCategory(e: React.MouseEvent, categoryId: string) {
    e.stopPropagation();
    setNewBankCategoryId(categoryId);
    setNewBankType("theory");
    setNewBankLanguage("");
    setShowCreateBank(true);
  }

  function startEditCategory(e: React.MouseEvent, category: Category) {
    e.stopPropagation();
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  }

  function startEditFolder(e: React.MouseEvent, folder: Folder) {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  }

  function getMasteryColor(mastery: number): string {
    if (mastery >= 80) return "mastery-excellent";
    if (mastery >= 60) return "mastery-good";
    if (mastery >= 40) return "mastery-fair";
    if (mastery > 0) return "mastery-needs-work";
    return "mastery-none";
  }

  function getBankTypeBadge(bank: Bank): {
    icon: string;
    label: string;
    className: string;
  } {
    if (bank.bank_type === "code") {
      const langLabel = bank.language
        ? bank.language.charAt(0).toUpperCase() + bank.language.slice(1)
        : "Code";
      return { icon: "💻", label: langLabel, className: "badge-code" };
    }
    if (bank.bank_type === "cli") {
      return { icon: "⌨️", label: "CLI", className: "badge-cli" };
    }
    return { icon: "📝", label: "Theory", className: "badge-theory" };
  }

  // ── Export/Import handlers ──────────────────────────────────────

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await api.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remaimber-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
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
      const text = await file.text();
      const data: ExportData = JSON.parse(text);
      const result = await api.importAll(data);
      setImportResult(result);
      await loadData();
    } catch (err) {
      console.error("Failed to import:", err);
      alert("Failed to import file. Please check the file format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // ── Derived data ────────────────────────────────────────────────

  const hasFolders = folders.length > 0;

  // Categories for the current view
  const getVisibleCategories = (): Category[] => {
    if (!hasFolders) return categories; // no folders → show all
    if (selectedFolderId === null) {
      // "All" tab selected → show unfiled categories
      return categories.filter((c) => !c.folder_id);
    }
    return categories.filter((c) => c.folder_id === selectedFolderId);
  };

  const visibleCategories = getVisibleCategories();
  const uncategorizedBanks = banks.filter((b) => !b.category_id);
  const getBanksForCategory = (categoryId: string) =>
    banks.filter((b) => b.category_id === categoryId);

  // Get selected folder object
  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

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

      {/* Import Result Modal */}
      {importResult && (
        <div className="modal-overlay" onClick={() => setImportResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✅ Import Complete</h2>
            <div className="import-result">
              {importResult.folders_created !== undefined &&
                importResult.folders_created > 0 && (
                  <div className="import-stat">
                    <span className="import-stat-value">
                      {importResult.folders_created}
                    </span>
                    <span className="import-stat-label">Folders</span>
                  </div>
                )}
              <div className="import-stat">
                <span className="import-stat-value">
                  {importResult.categories_created}
                </span>
                <span className="import-stat-label">Categories</span>
              </div>
              <div className="import-stat">
                <span className="import-stat-value">
                  {importResult.banks_created}
                </span>
                <span className="import-stat-label">Banks</span>
              </div>
              <div className="import-stat">
                <span className="import-stat-value">
                  {importResult.questions_created}
                </span>
                <span className="import-stat-label">Questions</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => setImportResult(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
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
              disabled={
                isExporting || (categories.length === 0 && banks.length === 0)
              }
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

      {/* ════════════════════════════════════════════════════════════
          FOLDERS BAR (horizontal row at top, like the wireframe)
         ════════════════════════════════════════════════════════════ */}
      <div className="folders-bar">
        <div className="folders-scroll">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`folder-card ${selectedFolderId === folder.id ? "folder-card-active" : ""}`}
              onClick={() =>
                selectFolder(selectedFolderId === folder.id ? null : folder.id)
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
                    <span
                      className={`folder-mastery ${getMasteryColor(folder.mastery)}`}
                    >
                      {folder.mastery}%
                    </span>
                    <span className="folder-cat-count">
                      {
                        categories.filter((c) => c.folder_id === folder.id)
                          .length
                      }{" "}
                      cat.
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

      {/* ════════════════════════════════════════════════════════════
          MODALS
         ════════════════════════════════════════════════════════════ */}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateFolder(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Folder</h2>
            <form onSubmit={handleCreateFolder}>
              <label className="input-label" htmlFor="folder-name">
                Folder Name
              </label>
              <input
                id="folder-name"
                type="text"
                className="input"
                placeholder="e.g., Backend, Frontend, DevOps"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateFolder(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newFolderName.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateCategory(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Category</h2>
            <form onSubmit={handleCreateCategory}>
              <label className="input-label" htmlFor="category-name">
                Category Name
              </label>
              <input
                id="category-name"
                type="text"
                className="input"
                placeholder="e.g., Programming, Science, Languages"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
              {hasFolders && (
                <div className="input-group" style={{ marginTop: "1rem" }}>
                  <label className="input-label">
                    Folder {selectedFolderId && "(pre-selected)"}
                  </label>
                  <div className="folder-picker">
                    <button
                      type="button"
                      className={`folder-pick-btn ${!selectedFolderId ? "active" : ""}`}
                      onClick={() => setSelectedFolderId(null)}
                    >
                      None (unfiled)
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`folder-pick-btn ${selectedFolderId === f.id ? "active" : ""}`}
                        onClick={() => setSelectedFolderId(f.id)}
                      >
                        📁 {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateCategory(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newCategoryName.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Bank Modal */}
      {showCreateBank && (
        <div className="modal-overlay" onClick={() => setShowCreateBank(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Question Bank</h2>
            <form onSubmit={handleCreateBank}>
              <label className="input-label" htmlFor="bank-subject">
                Subject
              </label>
              <input
                id="bank-subject"
                type="text"
                className="input"
                placeholder="e.g., Go Fundamentals, React Hooks"
                value={newBankSubject}
                onChange={(e) => setNewBankSubject(e.target.value)}
                autoFocus
              />

              <label className="input-label">Bank Type</label>
              <div className="type-selector">
                <button
                  type="button"
                  className={`type-btn ${newBankType === "theory" ? "active" : ""}`}
                  onClick={() => setNewBankType("theory")}
                >
                  <span className="type-icon">📝</span>
                  <span className="type-name">Theory</span>
                  <span className="type-desc">concepts, definitions</span>
                </button>
                <button
                  type="button"
                  className={`type-btn ${newBankType === "code" ? "active" : ""}`}
                  onClick={() => setNewBankType("code")}
                >
                  <span className="type-icon">💻</span>
                  <span className="type-name">Code</span>
                  <span className="type-desc">syntax, programming</span>
                </button>
                <button
                  type="button"
                  className={`type-btn ${newBankType === "cli" ? "active" : ""}`}
                  onClick={() => setNewBankType("cli")}
                >
                  <span className="type-icon">⌨️</span>
                  <span className="type-name">CLI</span>
                  <span className="type-desc">commands, terminal</span>
                </button>
              </div>

              {newBankType === "code" && (
                <>
                  <label className="input-label">Programming Language</label>
                  <div className="language-selector">
                    {[
                      { value: "go", label: "Go" },
                      { value: "javascript", label: "JavaScript" },
                      { value: "typescript", label: "TypeScript" },
                      { value: "python", label: "Python" },
                      { value: "rust", label: "Rust" },
                      { value: "java", label: "Java" },
                      { value: "c", label: "C" },
                      { value: "cpp", label: "C++" },
                      { value: "csharp", label: "C#" },
                      { value: "php", label: "PHP" },
                      { value: "ruby", label: "Ruby" },
                      { value: "swift", label: "Swift" },
                      { value: "kotlin", label: "Kotlin" },
                      { value: "sql", label: "SQL" },
                      { value: "yaml", label: "YAML" },
                      { value: "dockerfile", label: "Dockerfile" },
                      { value: "json", label: "JSON" },
                      { value: "xml", label: "XML" },
                      { value: "html", label: "HTML" },
                      { value: "css", label: "CSS" },
                      { value: "shell", label: "Shell" },
                      { value: "markdown", label: "Markdown" },
                      { value: "graphql", label: "GraphQL" },
                      { value: "scala", label: "Scala" },
                      { value: "lua", label: "Lua" },
                      { value: "perl", label: "Perl" },
                      { value: "r", label: "R" },
                      { value: "powershell", label: "PowerShell" },
                      { value: "hcl", label: "HCL / Terraform" },
                    ].map((lang) => (
                      <button
                        key={lang.value}
                        type="button"
                        className={`lang-btn ${newBankLanguage === lang.value ? "active" : ""}`}
                        onClick={() => setNewBankLanguage(lang.value)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateBank(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    !newBankSubject.trim() ||
                    !newBankCategoryId ||
                    isCreating ||
                    (newBankType === "code" && !newBankLanguage)
                  }
                >
                  {isCreating ? "Creating..." : "Create Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div
            className="modal modal-delete"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-modal-icon">⚠️</div>
            <h2>
              Delete{" "}
              {deleteModal.type === "folder"
                ? "Folder"
                : deleteModal.type === "category"
                  ? "Category"
                  : "Bank"}
              ?
            </h2>

            <div className="delete-modal-content">
              <p className="delete-target">
                <strong>"{deleteModal.name}"</strong>
              </p>

              {deleteModal.type === "folder" ? (
                <div className="delete-warning">
                  <p className="warning-text">
                    This will delete the folder. Categories inside will become
                    <strong> unfiled</strong> — they won't be deleted.
                  </p>
                  <ul className="warning-list">
                    <li>
                      <span className="warning-count">
                        {deleteModal.categoryCount}
                      </span>{" "}
                      categor{deleteModal.categoryCount !== 1 ? "ies" : "y"}{" "}
                      will become unfiled
                    </li>
                    <li>No banks or questions will be deleted</li>
                  </ul>
                </div>
              ) : deleteModal.type === "category" ? (
                <div className="delete-warning">
                  <p className="warning-text">
                    This will permanently delete this category and all its
                    content:
                  </p>
                  <ul className="warning-list">
                    <li>
                      <span className="warning-count">
                        {deleteModal.bankCount}
                      </span>{" "}
                      question bank{deleteModal.bankCount !== 1 ? "s" : ""}
                    </li>
                    <li>All questions within those banks</li>
                    <li>All practice session history</li>
                  </ul>
                  <p className="warning-final">This action cannot be undone.</p>
                </div>
              ) : (
                <div className="delete-warning">
                  <p className="warning-text">
                    This will permanently delete this bank and all its
                    questions.
                  </p>
                  <p className="warning-final">This action cannot be undone.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Category Modal */}
      {movingCategoryId && (
        <div
          className="modal-overlay"
          onClick={() => setMovingCategoryId(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Move Category</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Choose a folder for "
              {categories.find((c) => c.id === movingCategoryId)?.name}":
            </p>
            <div className="folder-picker folder-picker-move">
              <button
                className="folder-pick-btn"
                onClick={() => handleMoveCategory(movingCategoryId, null)}
              >
                📋 Unfiled (no folder)
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={`folder-pick-btn ${
                    categories.find((c) => c.id === movingCategoryId)
                      ?.folder_id === f.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleMoveCategory(movingCategoryId, f.id)}
                >
                  📁 {f.name}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setMovingCategoryId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          CATEGORIES LIST
         ════════════════════════════════════════════════════════════ */}
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
                  <span
                    className={`expand-icon ${isExpanded ? "expanded" : ""}`}
                  >
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
                        if (e.key === "Enter") {
                          handleUpdateCategory(category.id);
                        } else if (e.key === "Escape") {
                          setEditingCategoryId(null);
                        }
                      }}
                      onBlur={() => handleUpdateCategory(category.id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <h2 className="category-name">{category.name}</h2>
                  )}
                  <span className="category-count">
                    {categoryBanks.length} bank
                    {categoryBanks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="category-mastery">
                  <div
                    className={`mastery-badge ${getMasteryColor(category.mastery)}`}
                  >
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
                        setMovingCategoryId(category.id);
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
                          <div
                            className={`mastery-pill ${getMasteryColor(bank.mastery)}`}
                          >
                            {bank.mastery}% mastery
                          </div>
                          <span
                            className={`bank-type-badge ${typeBadge.className}`}
                          >
                            <span className="badge-icon">{typeBadge.icon}</span>
                            <span className="badge-label">
                              {typeBadge.label}
                            </span>
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
                    onClick={(e) => openCreateBankForCategory(e, category.id)}
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
                    <div
                      className={`mastery-pill ${getMasteryColor(bank.mastery)}`}
                    >
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
      {categories.length === 0 &&
        banks.length === 0 &&
        folders.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <p className="empty-state-text">
              Start by creating a folder to group your categories, or create a
              category directly to begin adding question banks.
            </p>
          </div>
        )}

      {/* Empty folder state */}
      {visibleCategories.length === 0 &&
        (categories.length > 0 || banks.length > 0) && (
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
