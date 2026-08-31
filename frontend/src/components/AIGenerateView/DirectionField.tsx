import { ChevronDownIcon, PencilIcon } from "./icons";

/** Canned directions, so the common cases don't have to be typed out. */
const PRESETS = [
  { label: "Beginner", text: "Keep questions simple and beginner-friendly" },
  { label: "Advanced", text: "Make questions challenging, focus on edge cases" },
  { label: "Practical", text: "Focus on practical real-world scenarios" },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
};

/** Free-text instructions passed through to the model, collapsed by default. */
export function DirectionField({ value, onChange, isOpen, onToggle }: Props) {
  return (
    <>
      <button
        type="button"
        className={`aigen-direction-toggle ${isOpen ? "aigen-direction-toggle--open" : ""}`}
        onClick={onToggle}
      >
        <div className="aigen-direction-toggle-left">
          <PencilIcon />
          <span>{value ? "Custom direction set" : "Add custom instructions..."}</span>
          {value && <span className="aigen-direction-indicator" />}
        </div>
        <ChevronDownIcon
          className={`aigen-direction-chevron ${isOpen ? "aigen-direction-chevron--open" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="aigen-direction-section">
          <textarea
            className="aigen-direction-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., Focus on practical scenarios, make questions harder..."
            rows={3}
          />
          <div className="aigen-direction-presets">
            <span className="aigen-presets-label">Presets:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="aigen-preset-btn"
                onClick={() => onChange(preset.text)}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className="aigen-preset-btn aigen-preset-btn--clear"
              onClick={() => onChange("")}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}
