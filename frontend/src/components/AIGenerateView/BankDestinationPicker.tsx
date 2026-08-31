import type { Bank } from "../../types";
import type { BankMode } from "./types";
import { PlusIcon } from "./icons";

type Props = {
  banks: Bank[];
  mode: BankMode;
  selectedBankId: string | null;
  onSelectExisting: (bankId: string) => void;
  onSelectNew: () => void;
  /** Locked once questions exist: they were generated for this destination. */
  disabled: boolean;
};

export function BankDestinationPicker({
  banks,
  mode,
  selectedBankId,
  onSelectExisting,
  onSelectNew,
  disabled,
}: Props) {
  return (
    <div
      className={`aigen-bank-wrapper ${disabled ? "aigen-bank-list--disabled" : ""}`}
    >
      {banks.length > 0 && (
        <div className="aigen-bank-list">
          {banks.map((bank) => (
            <button
              key={bank.id}
              type="button"
              className={`aigen-bank-option ${
                selectedBankId === bank.id && mode === "existing"
                  ? "aigen-bank-option--selected"
                  : ""
              }`}
              onClick={() => onSelectExisting(bank.id)}
              disabled={disabled}
            >
              <span className="aigen-bank-option-name">{bank.subject}</span>
              <span className="aigen-bank-option-count">
                {bank.question_count || 0} questions
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`aigen-bank-option aigen-bank-option--new ${
          mode === "new" ? "aigen-bank-option--selected" : ""
        }`}
        onClick={onSelectNew}
        disabled={disabled}
      >
        <PlusIcon />
        <span>Create new bank</span>
      </button>
    </div>
  );
}
