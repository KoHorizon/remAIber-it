import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { Folder, Category, Bank, BankType, ImportResult, ExportData } from "../types";
import { useLibraryData } from "./LibraryDataContext";

type LibraryActionsContextType = {
  refreshAll: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  updateFolder: (folderId: string, name: string) => Promise<Folder>;
  deleteFolder: (folderId: string) => Promise<void>;
  createCategory: (name: string, folderId?: string) => Promise<Category>;
  updateCategory: (categoryId: string, name: string) => Promise<Category>;
  moveCategory: (categoryId: string, folderId: string | null) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  reorderCategories: (ids: string[]) => Promise<void>;
  createBank: (subject: string, categoryId: string, bankType: BankType, language?: string) => Promise<Bank>;
  deleteBank: (bankId: string) => Promise<void>;
  refreshBank: (bankId: string) => Promise<Bank | null>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<ImportResult>;
};

const LibraryActionsContext = createContext<LibraryActionsContextType | null>(null);

type Props = {
  children: ReactNode;
  setSelectedFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFolderIdRef: React.RefObject<string | null>;
  selectedCategoryIdRef: React.RefObject<string | null>;
};

export function LibraryActionsProvider({
  children,
  setSelectedFolderId,
  setSelectedCategoryId,
  selectedFolderIdRef,
  selectedCategoryIdRef,
}: Props) {
  const { setFolders, setCategories, setBanks, refreshAll, categories } = useLibraryData();

  // Ref so deleteFolder/deleteCategory can read categories without deps
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const createFolder = useCallback(async (name: string) => {
    const folder = await api.createFolder(name);
    setFolders((prev) => [...prev, folder]);
    setSelectedFolderId(folder.id);
    setSelectedCategoryId(null);
    return folder;
  }, [setFolders, setSelectedFolderId, setSelectedCategoryId]);

  const updateFolder = useCallback(async (folderId: string, name: string) => {
    const updated = await api.updateFolder(folderId, name);
    setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
    return updated;
  }, [setFolders]);

  const deleteFolder = useCallback(async (folderId: string) => {
    const currentCategories = categoriesRef.current;
    const folderCategories = currentCategories.filter((c) => c.folder_id === folderId);
    await Promise.all(folderCategories.map((c) => api.updateCategoryFolder(c.id, null)));

    setCategories((prev) =>
      prev.map((c) => (c.folder_id === folderId ? { ...c, folder_id: null } : c))
    );

    await api.deleteFolder(folderId);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));

    if (selectedFolderIdRef.current === folderId) {
      setSelectedFolderId(null);
    }
  }, [setFolders, setCategories, setSelectedFolderId, selectedFolderIdRef]);

  const createCategory = useCallback(async (name: string, folderId?: string) => {
    const category = await api.createCategory(name, folderId);
    setCategories((prev) => [...prev, category]);
    return category;
  }, [setCategories]);

  const updateCategory = useCallback(async (categoryId: string, name: string) => {
    const updated = await api.updateCategory(categoryId, name);
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
    return updated;
  }, [setCategories]);

  const moveCategory = useCallback(async (categoryId: string, folderId: string | null) => {
    const updated = await api.updateCategoryFolder(categoryId, folderId);
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
    return updated;
  }, [setCategories]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    await api.deleteCategory(categoryId);
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setBanks((prev) => prev.filter((b) => b.category_id !== categoryId));
    if (selectedCategoryIdRef.current === categoryId) {
      setSelectedCategoryId(null);
    }
  }, [setCategories, setBanks, setSelectedCategoryId, selectedCategoryIdRef]);

  const reorderCategories = useCallback(async (ids: string[]) => {
    setCategories((prev) => {
      const ordered = ids
        .map((id) => prev.find((c) => c.id === id))
        .filter((c): c is Category => c !== undefined);
      const rest = prev.filter((c) => !ids.includes(c.id));
      return [...ordered, ...rest];
    });
    await api.reorderCategories(ids);
  }, [setCategories]);

  const createBank = useCallback(
    async (subject: string, categoryId: string, bankType: BankType, language?: string) => {
      const bank = await api.createBank(subject, categoryId, bankType, language);
      setBanks((prev) => [...prev, bank]);
      return bank;
    },
    [setBanks]
  );

  const deleteBank = useCallback(async (bankId: string) => {
    await api.deleteBank(bankId);
    setBanks((prev) => prev.filter((b) => b.id !== bankId));
  }, [setBanks]);

  const refreshBank = useCallback(async (bankId: string): Promise<Bank | null> => {
    try {
      const updated = await api.getBank(bankId);
      setBanks((prev) => prev.map((b) => (b.id === bankId ? updated : b)));
      return updated;
    } catch {
      return null;
    }
  }, [setBanks]);

  const exportData = useCallback(async () => {
    const data = await api.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remaimber-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(async (file: File): Promise<ImportResult> => {
    const text = await file.text();
    const data: ExportData = JSON.parse(text) as ExportData;
    const result = await api.importAll(data);
    await refreshAll();
    return result;
  }, [refreshAll]);

  const value = useMemo<LibraryActionsContextType>(
    () => ({
      refreshAll,
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
    }),
    [
      refreshAll,
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
    ]
  );

  return (
    <LibraryActionsContext.Provider value={value}>
      {children}
    </LibraryActionsContext.Provider>
  );
}

export function useLibraryActions() {
  const context = useContext(LibraryActionsContext);
  if (!context) {
    throw new Error("useLibraryActions must be used within a LibraryProvider");
  }
  return context;
}
