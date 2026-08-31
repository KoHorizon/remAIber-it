import type { BankType } from "../../types";
import { Button } from "../ui";
import { ArrowLeftIcon } from "./icons";
import type { SaveToBank } from "./useSaveToBank";

type ChipProps = {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
};

function SaveChip({ label, isSelected, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      className={`simulation-save-chip ${isSelected ? "simulation-save-chip--selected" : ""}`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

type Props = {
  save: SaveToBank;
  bankType: BankType;
};

/** Chooses where a graded question is filed: a category, then a bank in it. */
export function SaveToBankSlide({ save, bankType }: Props) {
  return (
    <div className="simulation-result-slide simulation-result-slide--save">
      <button
        type="button"
        className="simulation-back-btn"
        onClick={save.closeSaveView}
        title="Back to the score"
      >
        <ArrowLeftIcon size={14} />
        Back
      </button>
      <div className="simulation-save-content">
        <h3 className="simulation-save-title">Save Question</h3>
        <p className="simulation-save-hint">
          Add to an existing bank to practice later
        </p>

        <div className="simulation-save-section">
          <span className="simulation-save-label">Category</span>
          <div className="simulation-save-chips">
            {/* Not "all categories": it selects the banks that sit outside every one. */}
            <SaveChip
              label="Uncategorized"
              isSelected={save.selectedCategoryId === null}
              onSelect={() => save.selectCategory(null)}
            />
            {save.categories.map((c) => (
              <SaveChip
                key={c.id}
                label={c.name}
                isSelected={save.selectedCategoryId === c.id}
                onSelect={() => save.selectCategory(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="simulation-save-section">
          <span className="simulation-save-label">Bank</span>
          {save.matchingBanks.length > 0 ? (
            <div className="simulation-save-chips">
              {save.matchingBanks.map((b) => (
                <SaveChip
                  key={b.id}
                  label={b.subject}
                  isSelected={save.selectedBankId === b.id}
                  onSelect={() => save.selectBank(b.id)}
                />
              ))}
            </div>
          ) : (
            <p className="simulation-save-empty">
              No {bankType} banks in this category
            </p>
          )}
        </div>

        <Button
          variant="primary"
          onClick={save.save}
          disabled={!save.canSave || save.isSaving}
        >
          {save.isSaving ? "Saving..." : "Save to Bank"}
        </Button>
      </div>
    </div>
  );
}
