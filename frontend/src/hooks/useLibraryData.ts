import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import type { Folder, Category, Bank, BankType, ImportResult, ExportData } from "../types";

export type DeleteModalData = {
  type: "category" | "bank" | "folder";
  id: string;
  name: string;
  bankCount?: number;
  categoryCount?: number;
} | null;

export function useLibraryData() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

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
    } catch (err: unknown) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Folder operations
  const createFolder = useCallback(
    async (name: string) => {
      const folder = await api.createFolder(name);
      setFolders([...folders, folder]);
      setSelectedFolderId(folder.id);
      return folder;
    },
    [folders]
  );

  const updateFolder = useCallback(
    async (folderId: string, name: string) => {
      const updated = await api.updateFolder(folderId, name);
      setFolders(folders.map((f) => (f.id === folderId ? updated : f)));
      return updated;
    },
    [folders]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      await api.deleteFolder(folderId);
      setFolders(folders.filter((f) => f.id !== folderId));
      // Categories become unfiled (moved to Deleted folder by backend)
      await loadData(); // Reload to get accurate state
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
    },
    [folders, selectedFolderId, loadData]
  );

  // Category operations
  const createCategory = useCallback(
    async (name: string, folderId?: string) => {
      const category = await api.createCategory(name, folderId);
      setCategories([...categories, category]);
      return category;
    },
    [categories]
  );

  const updateCategory = useCallback(
    async (categoryId: string, name: string) => {
      const updated = await api.updateCategory(categoryId, name);
      setCategories(
        categories.map((c) => (c.id === categoryId ? updated : c))
      );
      return updated;
    },
    [categories]
  );

  const moveCategory = useCallback(
    async (categoryId: string, folderId: string | null) => {
      const updated = await api.updateCategoryFolder(categoryId, folderId);
      setCategories(
        categories.map((c) => (c.id === categoryId ? updated : c))
      );
      return updated;
    },
    [categories]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      await api.deleteCategory(categoryId);
      setCategories(categories.filter((c) => c.id !== categoryId));
      setBanks(banks.filter((b) => b.category_id !== categoryId));
    },
    [categories, banks]
  );

  // Bank operations
  const createBank = useCallback(
    async (
      subject: string,
      categoryId: string,
      bankType: BankType,
      language?: string
    ) => {
      const bank = await api.createBank(subject, categoryId, bankType, language);
      setBanks([...banks, bank]);
      return bank;
    },
    [banks]
  );

  const deleteBank = useCallback(
    async (bankId: string) => {
      await api.deleteBank(bankId);
      setBanks(banks.filter((b) => b.id !== bankId));
    },
    [banks]
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

  // Derived data
  const hasFolders = folders.length > 0;

  const getVisibleCategories = useCallback((): Category[] => {
    if (!hasFolders) return categories;
    // "All" tab shows all categories
    if (selectedFolderId === null) {
      return categories;
    }
    // Specific folder shows only its categories
    return categories.filter((c) => c.folder_id === selectedFolderId);
  }, [hasFolders, categories, selectedFolderId]);

  const getBanksForCategory = useCallback(
    (categoryId: string) => banks.filter((b) => b.category_id === categoryId),
    [banks]
  );

  const uncategorizedBanks = banks.filter((b) => !b.category_id);

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId) || null
    : null;

  return {
    // State
    folders,
    categories,
    banks,
    isLoading,
    selectedFolderId,
    setSelectedFolderId,
    expandedCategories,
    hasFolders,

    // Operations
    loadData,
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

    // Derived
    getVisibleCategories,
    getBanksForCategory,
    uncategorizedBanks,
    selectedFolder,
  };
}
