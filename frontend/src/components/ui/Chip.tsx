import type { ReactNode } from "react";
import "./Chip.css";

type ChipAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

export type ChipBadge = {
  content: ReactNode;
  className?: string;
};

type Props = {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badges?: ChipBadge[];
  actions?: ChipAction[];
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
};

export function Chip({
  label,
  isActive = false,
  onClick,
  badges,
  actions,
  isEditing = false,
  editValue = "",
  onEditChange,
  onEditSave,
  onEditCancel,
}: Props) {
  if (isEditing) {
    return (
      <div className="chip">
        <input
          type="text"
          className="chip-edit-input"
          value={editValue}
          onChange={(e) => onEditChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditSave?.();
            else if (e.key === "Escape") onEditCancel?.();
          }}
          onBlur={() => onEditSave?.()}
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`chip ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="chip-label">{label}</span>
      {badges?.map((badge, i) => (
        <span key={i} className={`chip-badge ${badge.className || ""}`}>
          {badge.content}
        </span>
      ))}
      {actions && actions.length > 0 && (
        <span className="chip-actions">
          {actions.map((action, i) => (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className={action.variant === "danger" ? "danger" : ""}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  action.onClick();
                }
              }}
              title={action.label}
            >
              {action.icon}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

// Pre-built action icons
export const ChipIcons = {
  edit: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  delete: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  move: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

// Add chip variant for creating new items
type AddChipProps = {
  label: string;
  isCreating?: boolean;
  createValue?: string;
  placeholder?: string;
  onStartCreate?: () => void;
  onCreateChange?: (value: string) => void;
  onCreateSave?: () => void;
  onCreateCancel?: () => void;
};

export function AddChip({
  label,
  isCreating = false,
  createValue = "",
  placeholder,
  onStartCreate,
  onCreateChange,
  onCreateSave,
  onCreateCancel,
}: AddChipProps) {
  if (isCreating) {
    return (
      <div className="chip chip-add creating">
        <input
          type="text"
          className="chip-edit-input"
          placeholder={placeholder}
          value={createValue}
          onChange={(e) => onCreateChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreateSave?.();
            else if (e.key === "Escape") onCreateCancel?.();
          }}
          onBlur={() => onCreateSave?.()}
          autoFocus
        />
      </div>
    );
  }

  return (
    <button type="button" className="chip chip-add" onClick={onStartCreate}>
      {label}
    </button>
  );
}
