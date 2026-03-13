import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  variant?: "default" | "delete";
};

export function Modal({
  title,
  children,
  actions,
  onClose,
  variant = "default",
}: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${variant === "delete" ? "modal-delete" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
