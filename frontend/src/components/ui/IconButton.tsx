import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: "default" | "danger";
  size?: "sm" | "md";
};

export function IconButton({
  icon,
  label,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: Props) {
  const sizeClass = size === "sm" ? "btn-icon-sm" : "";
  const variantClass = variant === "danger" ? "danger" : "";

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-icon ${sizeClass} ${variantClass} ${className}`.trim()}
      title={label}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}
