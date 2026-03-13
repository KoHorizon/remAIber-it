import { useState, useRef, useEffect } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = TYPE_OPTIONS.find((opt) => opt.value === (filterType || ""));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(value: string) {
    onTypeChange(value || null);
    setIsOpen(false);
  }

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
        <div className="custom-dropdown" ref={dropdownRef}>
          <button
            className={`custom-dropdown-trigger ${isOpen ? "open" : ""}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <span>{selectedOption?.label}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`dropdown-chevron ${isOpen ? "open" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {isOpen && (
            <div className="custom-dropdown-menu">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`custom-dropdown-item ${(filterType || "") === option.value ? "selected" : ""}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                  {(filterType || "") === option.value && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button className="filter-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="filter-spacer" />

      <button
        className="btn btn-primary btn-sm"
        onClick={onCreateBank}
        disabled={!canCreateBank}
      >
        + Bank
      </button>
    </div>
  );
}
