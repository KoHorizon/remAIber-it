import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, id, className = "", ...props }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className={`input ${className}`.trim()} {...props} />
    </div>
  );
}
