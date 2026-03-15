import { useState, type ReactNode } from "react";
import "./Tabs.css";

export type TabAction = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

export type TabItem = {
  id: string;
  label: string;
  actions?: TabAction[];
};

type Props = {
  tabs: TabItem[];
  activeId: string | null;
  onSelect: (id: string | null) => void;

  // Inline rename
  editingId?: string | null;
  editValue?: string;
  onEditChange?: (value: string) => void;
  onEditSave?: (id: string) => void;
  onEditCancel?: () => void;

  // Add new tab
  addLabel?: string;
  addPlaceholder?: string;
  onAdd?: (name: string) => Promise<void>;
};

export function Tabs({
  tabs,
  activeId,
  onSelect,
  editingId,
  editValue = "",
  onEditChange,
  onEditSave,
  onEditCancel,
  addLabel = "+ Add",
  addPlaceholder = "Name…",
  onAdd,
}: Props) {
  return (
    <div className="tabs">
      {tabs.map((tab) => {
        if (editingId === tab.id) {
          return (
            <div key={tab.id} className="tab-input-wrap">
              <input
                className="tab-input"
                value={editValue}
                autoFocus
                onChange={(e) => onEditChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onEditSave?.(tab.id);
                  else if (e.key === "Escape") onEditCancel?.();
                }}
                onBlur={() => onEditSave?.(tab.id)}
              />
            </div>
          );
        }

        const isActive = activeId === tab.id;

        if (tab.actions && tab.actions.length > 0) {
          return (
            <div key={tab.id} className={`tab-group ${isActive ? "active" : ""}`}>
              <button className="tab" onClick={() => onSelect(tab.id)}>
                {tab.label}
              </button>
              <span className="tab-actions">
                {tab.actions.map((action, i) => (
                  <span
                    key={i}
                    role="button"
                    tabIndex={0}
                    title={action.label}
                    className={`tab-action ${action.variant === "danger" ? "danger" : ""}`}
                    onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") action.onClick(); }}
                  >
                    {action.icon}
                  </span>
                ))}
              </span>
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            className={`tab ${isActive ? "active" : ""}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}

      {onAdd && <AddTab label={addLabel} placeholder={addPlaceholder} onAdd={onAdd} />}
    </div>
  );
}

type AddTabProps = {
  label: string;
  placeholder: string;
  onAdd: (name: string) => Promise<void>;
};

function AddTab({ label, placeholder, onAdd }: AddTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [value, setValue] = useState("");

  async function handleSave() {
    if (!value.trim()) {
      setIsCreating(false);
      return;
    }
    try {
      await onAdd(value.trim());
      setValue("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to add tab:", err);
    }
  }

  if (isCreating) {
    return (
      <div className="tab-input-wrap">
        <input
          className="tab-input"
          placeholder={placeholder}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            else if (e.key === "Escape") { setIsCreating(false); setValue(""); }
          }}
          onBlur={handleSave}
        />
      </div>
    );
  }

  return (
    <button className="tab tab-add" onClick={() => setIsCreating(true)}>
      {label}
    </button>
  );
}

