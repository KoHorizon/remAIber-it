import { Dropdown, Button } from "../ui";

type Props = {
  searchQuery: string;
  filterType: string | null;
  hasActiveFilters: boolean;
  canCreateBank: boolean;
  onSearchChange: (query: string) => void;
  onTypeChange: (type: string | null) => void;
  onClearFilters: () => void;
  onCreateBank: () => void;
};

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "theory", label: "Theory" },
  { value: "code", label: "Code" },
  { value: "cli", label: "CLI" },
];

export function LibraryFilters({
  searchQuery,
  filterType,
  hasActiveFilters,
  canCreateBank,
  onSearchChange,
  onTypeChange,
  onClearFilters,
  onCreateBank,
}: Props) {
  return (
    <div className="library-table-filters">
      <div className="filter-search">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search banks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-dropdowns">
        <Dropdown
          options={TYPE_OPTIONS}
          value={filterType || ""}
          onChange={(val) => onTypeChange(val || null)}
          emptyValue=""
        />

        {hasActiveFilters && (
          <button className="filter-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="filter-spacer" />

      <Button size="sm" onClick={onCreateBank} disabled={!canCreateBank}>
        + Bank
      </Button>
    </div>
  );
}
