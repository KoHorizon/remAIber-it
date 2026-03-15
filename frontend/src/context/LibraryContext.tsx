import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../api";
import type { Folder, Category, Bank, BankType, ImportResult, ExportData } from "../types";

type LibraryContextType = {
  // State
  folders: Folder[];
  categories: Category[];
  banks: Bank[];
  isLoading: boolean;
  selectedFolderId: string | null;
  selectedCategoryId: string | null;

  // Computed
  hasFolders: boolean;
  uncategorizedBanks: Bank[];
  visibleCategories: Category[];
  getBanksForCategory: (categoryId: string) => Bank[];
  getCategoryName: (categoryId: string | null | undefined) => string;

  // Selection
  selectFolder: (id: string | null) => void;
  selectCategory: (id: string | null) => void;

  // Folder operations
  createFolder: (name: string) => Promise<Folder>;
  updateFolder: (folderId: string, name: string) => Promise<Folder>;
  deleteFolder: (folderId: string) => Promise<void>;

  // Category operations
  createCategory: (name: string, folderId?: string) => Promise<Category>;
  updateCategory: (categoryId: string, name: string) => Promise<Category>;
  moveCategory: (categoryId: string, folderId: string | null) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  reorderCategories: (ids: string[]) => Promise<void>;

  // Bank operations
  createBank: (subject: string, categoryId: string, bankType: BankType, language?: string) => Promise<Bank>;
  deleteBank: (bankId: string) => Promise<void>;
  refreshBank: (bankId: string) => Promise<Bank | null>;

  // Import/Export
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<ImportResult>;

  // Refresh
  refreshAll: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  // Remember last selected category per workspace (folderId -> categoryId)
  const [categoryPerFolder, setCategoryPerFolder] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const [foldersData, categoriesData, banksData] = await Promise.all([
        api.getFolders(),
        api.getCategories(),
        api.getBanks(),
      ]);
      setFolders(foldersData || []);
      setCategories(categoriesData || []);
      setBanks(banksData || []);

      // Select first category on initial load (for "All" workspace)
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }
    } catch (err: unknown) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Computed values
  const hasFolders = folders.length > 0;
  const uncategorizedBanks = banks.filter((b) => !b.category_id);

  const visibleCategories = selectedFolderId
    ? categories.filter((c) => c.folder_id === selectedFolderId)
    : categories;

  const getBanksForCategory = useCallback(
    (categoryId: string) => banks.filter((b) => b.category_id === categoryId),
    [banks]
  );

  const getCategoryName = useCallback(
    (categoryId: string | null | undefined): string => {
      if (!categoryId) return "Uncategorized";
      const category = categories.find((c) => c.id === categoryId);
      return category?.name || "Uncategorized";
    },
    [categories]
  );

  // Selection handlers
  const selectFolder = useCallback(
    (folderId: string | null) => {
      // Save current category for current folder before switching
      if (selectedCategoryId) {
        const folderKey = selectedFolderId || "__all__";
        setCategoryPerFolder((prev) => ({ ...prev, [folderKey]: selectedCategoryId }));
      }

      setSelectedFolderId(folderId);

      // Get categories for the new folder
      const newVisibleCategories = folderId
        ? categories.filter((c) => c.folder_id === folderId)
        : categories;

      if (newVisibleCategories.length === 0) {
        // No categories available
        setSelectedCategoryId(null);
      } else {
        // Check if we have a remembered category for this folder
        const folderKey = folderId || "__all__";
        const rememberedCategoryId = categoryPerFolder[folderKey];

        if (rememberedCategoryId) {
          // Check if remembered category is still valid
          const stillExists = newVisibleCategories.some((c) => c.id === rememberedCategoryId);
          if (stillExists) {
            setSelectedCategoryId(rememberedCategoryId);
            return;
          }
        }

        // No remembered category or it's invalid, select first available
        setSelectedCategoryId(newVisibleCategories[0].id);
      }
    },
    [categories, selectedCategoryId, selectedFolderId, categoryPerFolder]
  );

  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    // Also save to memory for current folder
    if (categoryId) {
      const folderKey = selectedFolderId || "__all__";
      setCategoryPerFolder((prev) => ({ ...prev, [folderKey]: categoryId }));
    }
  }, [selectedFolderId]);

  // Folder operations
  const createFolder = useCallback(
    async (name: string) => {
      const folder = await api.createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setSelectedFolderId(folder.id);
      // New folder has no categories yet
      setSelectedCategoryId(null);
      return folder;
    },
    []
  );

  const updateFolder = useCallback(
    async (folderId: string, name: string) => {
      const updated = await api.updateFolder(folderId, name);
      setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
      return updated;
    },
    []
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      // Move all categories in this folder to "No workspace" before deleting
      const folderCategories = categories.filter((c) => c.folder_id === folderId);
      await Promise.all(
        folderCategories.map((c) => api.updateCategoryFolder(c.id, null))
      );

      // Update local state to reflect moved categories
      setCategories((prev) =>
        prev.map((c) => (c.folder_id === folderId ? { ...c, folder_id: null } : c))
      );

      // Now delete the empty folder
      await api.deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));

      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
    },
    [selectedFolderId, categories]
  );

  // Category operations
  const createCategory = useCallback(
    async (name: string, folderId?: string) => {
      const category = await api.createCategory(name, folderId);
      setCategories((prev) => [...prev, category]);
      return category;
    },
    []
  );

  const updateCategory = useCallback(
    async (categoryId: string, name: string) => {
      const updated = await api.updateCategory(categoryId, name);
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
      return updated;
    },
    []
  );

  const moveCategory = useCallback(
    async (categoryId: string, folderId: string | null) => {
      const updated = await api.updateCategoryFolder(categoryId, folderId);
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
      return updated;
    },
    []
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      await api.deleteCategory(categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setBanks((prev) => prev.filter((b) => b.category_id !== categoryId));
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
      }
    },
    [selectedCategoryId]
  );

  const reorderCategories = useCallback(
    async (ids: string[]) => {
      // Optimistic update: reorder in local state immediately
      setCategories((prev) => {
        const ordered = ids
          .map((id) => prev.find((c) => c.id === id))
          .filter((c): c is Category => c !== undefined);
        const rest = prev.filter((c) => !ids.includes(c.id));
        return [...ordered, ...rest];
      });
      await api.reorderCategories(ids);
    },
    []
  );

  // Bank operations
  const createBank = useCallback(
    async (subject: string, categoryId: string, bankType: BankType, language?: string) => {
      const bank = await api.createBank(subject, categoryId, bankType, language);
      setBanks((prev) => [...prev, bank]);
      return bank;
    },
    []
  );

  const deleteBank = useCallback(
    async (bankId: string) => {
      await api.deleteBank(bankId);
      await loadData();
    },
    [loadData]
  );

  const refreshBank = useCallback(
    async (bankId: string): Promise<Bank | null> => {
      try {
        const updated = await api.getBank(bankId);
        setBanks((prev) => prev.map((b) => (b.id === bankId ? updated : b)));
        return updated;
      } catch {
        return null;
      }
    },
    []
  );

  // Import/Export
  const exportData = useCallback(async () => {
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
  }, []);

  const importData = useCallback(
    async (file: File): Promise<ImportResult> => {
      const text = await file.text();
      const data: ExportData = JSON.parse(text) as ExportData;
      const result = await api.importAll(data);
      await loadData();
      return result;
    },
    [loadData]
  );

  const value: LibraryContextType = {
    // State
    folders,
    categories,
    banks,
    isLoading,
    selectedFolderId,
    selectedCategoryId,

    // Computed
    hasFolders,
    uncategorizedBanks,
    visibleCategories,
    getBanksForCategory,
    getCategoryName,

    // Selection
    selectFolder,
    selectCategory,

    // Operations
    createFolder,
    updateFolder,
    deleteFolder,
    createCategory,
    updateCategory,
    moveCategory,
    deleteCategory,
    reorderCategories,
    createBank,
    deleteBank,
    refreshBank,
    exportData,
    importData,
    refreshAll: loadData,
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
