import type { BankType } from "../../types";

const TYPES: { value: BankType; label: string }[] = [
  { value: "theory", label: "Theory" },
  { value: "code", label: "Code" },
  { value: "cli", label: "CLI" },
];

type Props = {
  value: BankType;
  onChange: (value: BankType) => void;
};

/**
 * Picks which kind of answer is being simulated. A separate component rather
 * than JSX built inline: the layouts each narrow `bankType` to a single value,
 * which made comparing it against the other two a type error.
 */
export function TypeSwitcher({ value, onChange }: Props) {
  return (
    <div className="simulation-type-switcher">
      {TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          className={`simulation-type-btn ${value === type.value ? "active" : ""}`}
          onClick={() => onChange(type.value)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
