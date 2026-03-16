import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Category } from "../types";
import { useLibraryData } from "./LibraryDataContext";

type LibrarySelectionContextType = {
  selectedFolderId: string | null;
  selectedCategoryId: string | null;
  visibleCategories: Category[];
  selectFolder: (id: string | null) => void;
  selectCategory: (id: string | null) => void;
};

const LibrarySelectionContext = createContext<LibrarySelectionContextType | null>(null);

type Props = {
  children: ReactNode;
  selectedFolderId: string | null;
  setSelectedFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCategoryId: string | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  categoryPerFolder: Record<string, string>;
  setCategoryPerFolder: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

export function LibrarySelectionProvider({
  children,
  selectedFolderId,
  setSelectedFolderId,
  selectedCategoryId,
  setSelectedCategoryId,
  categoryPerFolder,
  setCategoryPerFolder,
}: Props) {
  const { categories } = useLibraryData();

  // Refs so selectFolder/selectCategory are stable (deps: [])
  const selectedFolderIdRef = useRef(selectedFolderId);
  const selectedCategoryIdRef = useRef(selectedCategoryId);
  const categoryPerFolderRef = useRef(categoryPerFolder);
  const categoriesRef = useRef(categories);

  selectedFolderIdRef.current = selectedFolderId;
  selectedCategoryIdRef.current = selectedCategoryId;
  categoryPerFolderRef.current = categoryPerFolder;
  categoriesRef.current = categories;

  const selectFolder = useCallback((folderId: string | null) => {
    const currentCategoryId = selectedCategoryIdRef.current;
    const currentFolderId = selectedFolderIdRef.current;
    const currentPerFolder = categoryPerFolderRef.current;
    const currentCategories = categoriesRef.current;

    // Save current category for the folder we're leaving
    if (currentCategoryId) {
      const folderKey = currentFolderId || "__all__";
      setCategoryPerFolder((prev) => ({ ...prev, [folderKey]: currentCategoryId }));
    }

    setSelectedFolderId(folderId);

    // Compute visible categories for the new folder
    const newVisibleCategories = folderId
      ? currentCategories.filter((c) => c.folder_id === folderId)
      : currentCategories;

    if (newVisibleCategories.length === 0) {
      setSelectedCategoryId(null);
    } else {
      const folderKey = folderId || "__all__";
      const rememberedCategoryId = currentPerFolder[folderKey];

      if (rememberedCategoryId) {
        const stillExists = newVisibleCategories.some((c) => c.id === rememberedCategoryId);
        if (stillExists) {
          setSelectedCategoryId(rememberedCategoryId);
          return;
        }
      }

      setSelectedCategoryId(newVisibleCategories[0].id);
    }
  }, []); // stable — all reads go through refs

  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    if (categoryId) {
      const folderKey = selectedFolderIdRef.current || "__all__";
      setCategoryPerFolder((prev) => ({ ...prev, [folderKey]: categoryId }));
    }
  }, []); // stable — selectedFolderId read via ref

  const visibleCategories = useMemo(
    () =>
      selectedFolderId
        ? categories.filter((c) => c.folder_id === selectedFolderId)
        : categories,
    [categories, selectedFolderId]
  );

  const value = useMemo<LibrarySelectionContextType>(
    () => ({
      selectedFolderId,
      selectedCategoryId,
      visibleCategories,
      selectFolder,
      selectCategory,
    }),
    [selectedFolderId, selectedCategoryId, visibleCategories, selectFolder, selectCategory]
  );

  return (
    <LibrarySelectionContext.Provider value={value}>
      {children}
    </LibrarySelectionContext.Provider>
  );
}

export function useLibrarySelection() {
  const context = useContext(LibrarySelectionContext);
  if (!context) {
    throw new Error("useLibrarySelection must be used within a LibraryProvider");
  }
  return context;
}
