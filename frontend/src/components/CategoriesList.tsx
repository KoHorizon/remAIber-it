import { useState, useEffect } from "react";
import { api, Category, Bank } from "../App";
import "./CategoriesList.css";

type Props = {
  onSelectBank: (bankId: string) => void;
};

export function CategoriesList({ onSelectBank }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Modal states
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBankSubject, setNewBankSubject] = useState("");
  const [newBankCategoryId, setNewBankCategoryId] = useState<
    string | undefined
  >(undefined);
  const [isCreating, setIsCreating] = useState(false);

  // Edit category state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    type: "category" | "bank";
    id: string;
    name: string;
    bankCount?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [categoriesData, banksData] = await Promise.all([
        api.getCategories(),
        api.getBanks(),
      ]);
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

  // Category CRUD
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const category = await api.createCategory(newCategoryName.trim());
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
      if (deleteModal.type === "category") {
        const categoryId = deleteModal.id;
        await api.deleteCategory(categoryId);
        setCategories(categories.filter((c) => c.id !== categoryId));
        // Remove banks that were in this category (they're deleted on backend now)
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

  // Bank CRUD
  async function handleCreateBank(e: React.FormEvent) {
    e.preventDefault();
    if (!newBankSubject.trim() || !newBankCategoryId || isCreating) return;

    setIsCreating(true);
    try {
      const bank = await api.createBank(
        newBankSubject.trim(),
        newBankCategoryId,
      );
      setBanks([...banks, bank]);
      setNewBankSubject("");
      setNewBankCategoryId(undefined);
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
    setShowCreateBank(true);
  }

  function startEditCategory(e: React.MouseEvent, category: Category) {
    e.stopPropagation();
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  }

  function getMasteryColor(mastery: number): string {
    if (mastery >= 80) return "mastery-excellent";
    if (mastery >= 60) return "mastery-good";
    if (mastery >= 40) return "mastery-fair";
    if (mastery > 0) return "mastery-needs-work";
    return "mastery-none";
  }

  // Filter banks
  const uncategorizedBanks = banks.filter((b) => !b.category_id);
  const getBanksForCategory = (categoryId: string) =>
    banks.filter((b) => b.category_id === categoryId);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="categories-list animate-fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Your Learning Library</h1>
            <p className="page-subtitle">
              {categories.length === 0 && banks.length === 0
                ? "Create categories to organize your question banks"
                : `${categories.length} categories, ${banks.length} banks`}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreateCategory(true)}
            >
              + Category
            </button>
          </div>
        </div>
      </div>

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
                    !newBankSubject.trim() || !newBankCategoryId || isCreating
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
              Delete {deleteModal.type === "category" ? "Category" : "Bank"}?
            </h2>

            <div className="delete-modal-content">
              <p className="delete-target">
                <strong>"{deleteModal.name}"</strong>
              </p>

              {deleteModal.type === "category" ? (
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

      {/* Categories */}
      <div className="categories-section">
        {categories.map((category, i) => {
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
                  {categoryBanks.map((bank) => (
                    <div
                      key={bank.id}
                      className="bank-card card card-interactive"
                      onClick={() => onSelectBank(bank.id)}
                    >
                      <div className="bank-card-header">
                        <span className="bank-icon">📚</span>
                        <span className="bank-name">{bank.subject}</span>
                      </div>
                      <div className="bank-card-footer">
                        <div
                          className={`mastery-pill ${getMasteryColor(bank.mastery)}`}
                        >
                          {bank.mastery}% mastery
                        </div>
                      </div>
                      <button
                        className="btn-delete"
                        onClick={(e) => openDeleteBankModal(e, bank)}
                        title="Delete bank"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
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
            {uncategorizedBanks.map((bank) => (
              <div
                key={bank.id}
                className="bank-card card card-interactive"
                onClick={() => onSelectBank(bank.id)}
              >
                <div className="bank-card-header">
                  <span className="bank-icon">📚</span>
                  <span className="bank-name">{bank.subject}</span>
                </div>
                <div className="bank-card-footer">
                  <div
                    className={`mastery-pill ${getMasteryColor(bank.mastery)}`}
                  >
                    {bank.mastery}% mastery
                  </div>
                </div>
                <button
                  className="btn-delete"
                  onClick={(e) => openDeleteBankModal(e, bank)}
                  title="Delete bank"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {categories.length === 0 && banks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <p className="empty-state-text">
            Start by creating a category to organize your question banks, or
            create a bank directly to begin adding questions.
          </p>
        </div>
      )}
    </div>
  );
}
