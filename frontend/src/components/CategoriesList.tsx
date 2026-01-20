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

  async function handleDeleteCategory(e: React.MouseEvent, categoryId: string) {
    e.stopPropagation();
    if (!confirm("Delete this category? Banks will become uncategorized."))
      return;

    try {
      await api.deleteCategory(categoryId);
      setCategories(categories.filter((c) => c.id !== categoryId));
      // Update banks that were in this category
      setBanks(
        banks.map((b) =>
          b.category_id === categoryId ? { ...b, category_id: null } : b,
        ),
      );
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  }

  // Bank CRUD
  async function handleCreateBank(e: React.FormEvent) {
    e.preventDefault();
    if (!newBankSubject.trim() || isCreating) return;

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

  async function handleDeleteBank(e: React.MouseEvent, bankId: string) {
    e.stopPropagation();
    if (!confirm("Delete this bank and all its questions?")) return;

    try {
      await api.deleteBank(bankId);
      setBanks(banks.filter((b) => b.id !== bankId));
    } catch (err) {
      console.error("Failed to delete bank:", err);
    }
  }

  function startEditCategory(e: React.MouseEvent, category: Category) {
    e.stopPropagation();
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
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
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateBank(true)}
            >
              + Bank
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

              <label className="input-label" htmlFor="bank-category">
                Category (optional)
              </label>
              <select
                id="bank-category"
                className="input"
                value={newBankCategoryId || ""}
                onChange={(e) =>
                  setNewBankCategoryId(e.target.value || undefined)
                }
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

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
                  disabled={!newBankSubject.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Bank"}
                </button>
              </div>
            </form>
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
                <div className="category-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => startEditCategory(e, category)}
                    title="Edit category"
                  >
                    ✎
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={(e) => handleDeleteCategory(e, category.id)}
                    title="Delete category"
                  >
                    ×
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="category-banks">
                  {categoryBanks.length === 0 ? (
                    <p className="empty-category">
                      No banks in this category yet
                    </p>
                  ) : (
                    categoryBanks.map((bank) => (
                      <div
                        key={bank.id}
                        className="bank-card card card-interactive"
                        onClick={() => onSelectBank(bank.id)}
                      >
                        <button
                          className="btn-delete"
                          onClick={(e) => handleDeleteBank(e, bank.id)}
                          title="Delete bank"
                        >
                          ×
                        </button>
                        <div className="bank-card-icon">◇</div>
                        <h3 className="bank-card-title">{bank.subject}</h3>
                        <span className="bank-card-id">
                          ID: {bank.id.slice(0, 8)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Uncategorized Banks */}
      {uncategorizedBanks.length > 0 && (
        <div className="uncategorized-section">
          <h3 className="section-title">Uncategorized</h3>
          <div className="banks-grid">
            {uncategorizedBanks.map((bank, i) => (
              <div
                key={bank.id}
                className="bank-card card card-interactive"
                onClick={() => onSelectBank(bank.id)}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <button
                  className="btn-delete"
                  onClick={(e) => handleDeleteBank(e, bank.id)}
                  title="Delete bank"
                >
                  ×
                </button>
                <div className="bank-card-icon">◇</div>
                <h3 className="bank-card-title">{bank.subject}</h3>
                <span className="bank-card-id">ID: {bank.id.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {categories.length === 0 && banks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <p className="empty-state-text">
            Start by creating a category to organize your learning, then add
            question banks.
          </p>
        </div>
      )}
    </div>
  );
}
