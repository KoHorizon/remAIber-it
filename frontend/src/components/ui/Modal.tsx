import type { ReactNode } from "react";
import "./Modal.css";

type Props = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  variant?: "default" | "delete";
  showCloseButton?: boolean;
};

export function Modal({
  title,
  children,
  actions,
  onClose,
  variant = "default",
  showCloseButton = true,
}: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${variant === "delete" ? "modal-delete" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          {showCloseButton && (
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
