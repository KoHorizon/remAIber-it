import { useState, useMemo } from "react";
import type { Bank, Category } from "../../types";
import type { SortField, SortDirection } from "./types";

type UseLibraryFiltersProps = {
  banks: Bank[];
  categories: Category[];
  selectedFolderId: string | null;
  selectedCategoryId: string | null;
  getCategoryName: (categoryId: string | null | undefined) => string;
};

export function useLibraryFilters({
  banks,
  categories,
  selectedFolderId,
  selectedCategoryId,
  getCategoryName,
}: UseLibraryFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredAndSortedBanks = useMemo(() => {
    let result = [...banks];

    // Filter by folder (workspace)
    if (selectedFolderId) {
      const folderCategoryIds = categories
        .filter((c) => c.folder_id === selectedFolderId)
        .map((c) => c.id);
      result = result.filter(
        (b) => b.category_id && folderCategoryIds.includes(b.category_id)
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.subject.toLowerCase().includes(query) ||
          getCategoryName(b.category_id).toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategoryId) {
      if (selectedCategoryId === "uncategorized") {
        result = result.filter((b) => !b.category_id);
      } else {
        result = result.filter((b) => b.category_id === selectedCategoryId);
      }
    }

    // Filter by type
    if (filterType) {
      result = result.filter((b) => b.bank_type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.subject.localeCompare(b.subject);
          break;
        case "category":
          comparison = getCategoryName(a.category_id).localeCompare(
            getCategoryName(b.category_id)
          );
          break;
        case "type":
          comparison = (a.bank_type || "theory").localeCompare(
            b.bank_type || "theory"
          );
          break;
        case "mastery":
          comparison = a.mastery - b.mastery;
          break;
        case "questions":
          comparison =
            (a.questions?.length || 0) - (b.questions?.length || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    banks,
    categories,
    selectedFolderId,
    selectedCategoryId,
    searchQuery,
    filterType,
    sortField,
    sortDirection,
    getCategoryName,
  ]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterType(null);
  }

  const hasActiveFilters = Boolean(searchQuery || selectedCategoryId || filterType);

  return {
    // Filter state
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,

    // Sort state
    sortField,
    sortDirection,
    handleSort,

    // Results
    filteredAndSortedBanks,
    hasActiveFilters,
    clearFilters,
  };
}
