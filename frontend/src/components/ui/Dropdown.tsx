import { useState, useRef, useEffect, type ReactNode } from "react";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string = string> = {
  options: DropdownOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  emptyValue?: T;
  renderOption?: (option: DropdownOption<T>, isSelected: boolean) => ReactNode;
};

export function Dropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyValue,
  renderOption,
}: Props<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(optionValue: T) {
    onChange(optionValue === emptyValue ? null : optionValue);
    setIsOpen(false);
  }

  return (
    <div className="custom-dropdown" ref={ref}>
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayLabel}</span>
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
          {options.map((option) => {
            const isSelected = value === option.value || (value === null && option.value === emptyValue);
            return (
              <button
                key={option.value}
                type="button"
                className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(option.value)}
              >
                {renderOption ? (
                  renderOption(option, isSelected)
                ) : (
                  <>
                    {option.label}
                    {isSelected && (
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
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
