import type { Bank } from "../../types";
import { Button } from "../ui";
import { getMasteryLevel } from "../../utils/mastery";
import type { SortField, SortDirection } from "./types";

type Props = {
  banks: Bank[];
  sortField: SortField;
  sortDirection: SortDirection;
  hasActiveFilters: boolean;
  totalBanksInCategory: number;
  getCategoryName: (categoryId: string | null | undefined) => string;
  onSort: (field: SortField) => void;
  onSelectBank: (bankId: string) => void;
  onDeleteBank: (e: React.MouseEvent, bank: Bank) => void;
  onClearFilters: () => void;
};

function getBankTypeLabel(bank: Bank): string {
  if (bank.bank_type === "code") return bank.language || "Code";
  if (bank.bank_type === "cli") return "CLI";
  return "Theory";
}

function getBankTypeClass(bank: Bank): string {
  if (bank.bank_type === "code") return "type-code";
  if (bank.bank_type === "cli") return "type-cli";
  return "type-theory";
}

function SortIcon({
  field,
  current,
  direction,
}: {
  field: SortField;
  current: SortField;
  direction: SortDirection;
}) {
  if (field !== current) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="sort-icon inactive"
      >
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
      </svg>
    );
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="sort-icon active"
    >
      {direction === "asc" ? (
        <path d="M7 14l5-5 5 5" />
      ) : (
        <path d="M7 10l5 5 5-5" />
      )}
    </svg>
  );
}

export function LibraryTable({
  banks,
  sortField,
  sortDirection,
  hasActiveFilters,
  totalBanksInCategory,
  getCategoryName,
  onSort,
  onSelectBank,
  onDeleteBank,
  onClearFilters,
}: Props) {
  // Determine empty state type
  const isEmpty = banks.length === 0;
  const isFilteredEmpty = isEmpty && hasActiveFilters && totalBanksInCategory > 0;
  const isTrulyEmpty = isEmpty && totalBanksInCategory === 0;

  return (
    <div className="library-table-wrapper">
      <table className="library-table-content">
        <thead>
          <tr>
            <th className="col-name" onClick={() => onSort("name")}>
              Name
              <SortIcon field="name" current={sortField} direction={sortDirection} />
            </th>
            <th className="col-category" onClick={() => onSort("category")}>
              Category
              <SortIcon field="category" current={sortField} direction={sortDirection} />
            </th>
            <th className="col-type" onClick={() => onSort("type")}>
              Type
              <SortIcon field="type" current={sortField} direction={sortDirection} />
            </th>
            <th className="col-mastery" onClick={() => onSort("mastery")}>
              Mastery
              <SortIcon field="mastery" current={sortField} direction={sortDirection} />
            </th>
            <th className="col-questions" onClick={() => onSort("questions")}>
              Questions
              <SortIcon field="questions" current={sortField} direction={sortDirection} />
            </th>
            <th className="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          {banks.map((bank) => (
            <tr key={bank.id} onClick={() => onSelectBank(bank.id)}>
              <td className="col-name">
                <span className="bank-name">{bank.subject}</span>
              </td>
              <td className="col-category">
                <span className="category-badge">
                  {getCategoryName(bank.category_id)}
                </span>
              </td>
              <td className="col-type">
                <span className={`type-badge ${getBankTypeClass(bank)}`}>
                  {getBankTypeLabel(bank)}
                </span>
              </td>
              <td className="col-mastery">
                <div className="mastery-cell">
                  <div className="mastery-bar">
                    <div
                      className={`mastery-fill ${getMasteryLevel(bank.mastery)}`}
                      style={{ width: `${bank.mastery}%` }}
                    />
                  </div>
                  <span className={`mastery-value ${getMasteryLevel(bank.mastery)}`}>
                    {bank.mastery}%
                  </span>
                </div>
              </td>
              <td className="col-questions">{bank.question_count ?? 0}</td>
              <td className="col-actions">
                <button
                  className="row-action-btn danger"
                  onClick={(e) => onDeleteBank(e, bank)}
                  title="Delete"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isFilteredEmpty && (
        <div className="table-empty">
          <p>No banks match your filters.</p>
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {isTrulyEmpty && (
        <div className="table-empty">
          <p>No banks in this category yet.</p>
          <p className="table-empty-hint">Click "+ Bank" to create one.</p>
        </div>
      )}
    </div>
  );
}
