type Props = {
  searchQuery: string;
  filterType: string | null;
  hasActiveFilters: boolean;
  onSearchChange: (query: string) => void;
  onTypeChange: (type: string | null) => void;
  onClearFilters: () => void;
};

export function LibraryFilters({
  searchQuery,
  filterType,
  hasActiveFilters,
  onSearchChange,
  onTypeChange,
  onClearFilters,
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
        <select
          value={filterType || ""}
          onChange={(e) => onTypeChange(e.target.value || null)}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="theory">Theory</option>
          <option value="code">Code</option>
          <option value="cli">CLI</option>
        </select>

        {hasActiveFilters && (
          <button className="filter-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
