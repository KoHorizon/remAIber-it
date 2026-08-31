import type { BankType } from "../../types";

const TYPES: { value: BankType; label: string }[] = [
  { value: "theory", label: "Theory" },
  { value: "code", label: "Code" },
  { value: "cli", label: "CLI" },
];

type Props = {
  value: BankType;
  onChange: (type: BankType) => void;
  /** Locked once questions exist: they were generated for the current type. */
  disabled: boolean;
};

export function BankTypeSwitcher({ value, onChange, disabled }: Props) {
  return (
    <div
      className={`aigen-type-switcher ${disabled ? "aigen-type-switcher--disabled" : ""}`}
    >
      {TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          className={`aigen-type-btn ${value === type.value ? "active" : ""}`}
          onClick={() => onChange(type.value)}
          disabled={disabled}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
