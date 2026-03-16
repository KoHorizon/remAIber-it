import { useState, useRef, useCallback, type ReactNode } from "react";
import { LibraryDataProvider } from "./LibraryDataContext";
import { LibraryActionsProvider } from "./LibraryActionsContext";
import { LibrarySelectionProvider } from "./LibrarySelectionContext";

type Props = {
  children: ReactNode;
};

export function LibraryProvider({ children }: Props) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryPerFolder, setCategoryPerFolder] = useState<Record<string, string>>({});

  // Stable refs so actions can read selection without deps
  const selectedFolderIdRef = useRef<string | null>(selectedFolderId);
  const selectedCategoryIdRef = useRef<string | null>(selectedCategoryId);
  selectedFolderIdRef.current = selectedFolderId;
  selectedCategoryIdRef.current = selectedCategoryId;

  // Called once after initial data load to pre-select the first category
  const handleInitialLoad = useCallback((firstCategoryId: string) => {
    setSelectedCategoryId((prev) => (prev === null ? firstCategoryId : prev));
  }, []);

  return (
    <LibraryDataProvider onInitialLoad={handleInitialLoad}>
      <LibraryActionsProvider
        setSelectedFolderId={setSelectedFolderId}
        setSelectedCategoryId={setSelectedCategoryId}
        selectedFolderIdRef={selectedFolderIdRef}
        selectedCategoryIdRef={selectedCategoryIdRef}
      >
        <LibrarySelectionProvider
          selectedFolderId={selectedFolderId}
          setSelectedFolderId={setSelectedFolderId}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          categoryPerFolder={categoryPerFolder}
          setCategoryPerFolder={setCategoryPerFolder}
        >
          {children}
        </LibrarySelectionProvider>
      </LibraryActionsProvider>
    </LibraryDataProvider>
  );
}
