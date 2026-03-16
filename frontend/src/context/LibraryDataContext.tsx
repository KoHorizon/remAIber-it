import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { Folder, Category, Bank } from "../types";

type LibraryDataContextType = {
  folders: Folder[];
  categories: Category[];
  banks: Bank[];
  isLoading: boolean;
  error: string | null;
  hasFolders: boolean;
  getCategoryName: (categoryId: string | null | undefined) => string;
  // Internal setters exposed for the actions layer
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setBanks: React.Dispatch<React.SetStateAction<Bank[]>>;
  refreshAll: () => Promise<void>;
};

const LibraryDataContext = createContext<LibraryDataContextType | null>(null);

type Props = {
  children: ReactNode;
  onInitialLoad: (firstCategoryId: string) => void;
};

export function LibraryDataProvider({ children, onInitialLoad }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onInitialLoadRef = React.useRef(onInitialLoad);
  onInitialLoadRef.current = onInitialLoad;

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [foldersData, categoriesData, banksData] = await Promise.all([
        api.getFolders(),
        api.getCategories(),
        api.getBanks(),
      ]);
      setFolders(foldersData || []);
      setCategories(categoriesData || []);
      setBanks(banksData || []);

      if (categoriesData && categoriesData.length > 0) {
        onInitialLoadRef.current(categoriesData[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasFolders = useMemo(() => folders.length > 0, [folders]);

  const getCategoryName = useCallback(
    (categoryId: string | null | undefined): string => {
      if (!categoryId) return "Uncategorized";
      const category = categories.find((c) => c.id === categoryId);
      return category?.name || "Uncategorized";
    },
    [categories]
  );

  const value = useMemo<LibraryDataContextType>(
    () => ({
      folders,
      categories,
      banks,
      isLoading,
      error,
      hasFolders,
      getCategoryName,
      setFolders,
      setCategories,
      setBanks,
      refreshAll: loadData,
    }),
    [folders, categories, banks, isLoading, error, hasFolders, getCategoryName, loadData]
  );

  return (
    <LibraryDataContext.Provider value={value}>
      {children}
    </LibraryDataContext.Provider>
  );
}

export function useLibraryData() {
  const context = useContext(LibraryDataContext);
  if (!context) {
    throw new Error("useLibraryData must be used within a LibraryProvider");
  }
  return context;
}

// Export internal context for use by sibling providers
export { LibraryDataContext };
