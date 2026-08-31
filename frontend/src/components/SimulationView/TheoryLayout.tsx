import { useRef } from "react";
import { ResultCard } from "./ResultCard";
import { TypeSwitcher } from "./TypeSwitcher";
import type { SaveToBank } from "./useSaveToBank";
import type { Simulation } from "./useSimulation";

type CardProps = {
  label: string;
  sublabel?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

/**
 * One labelled prose field. The card is clickable rather than using a `<label>`
 * because the whole surface — padding included — focuses the textarea.
 */
function FieldCard({
  label,
  sublabel,
  placeholder,
  value,
  onChange,
  autoFocus,
  className = "",
  textareaRef,
}: CardProps) {
  return (
    <div
      className={`simulation-card ${className}`}
      onClick={() => textareaRef.current?.focus()}
    >
      <div className="simulation-card-header">
        <span className="simulation-card-label">{label}</span>
        {sublabel && <span className="simulation-card-sublabel">{sublabel}</span>}
      </div>
      <textarea
        ref={textareaRef}
        className="simulation-card-textarea"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
    </div>
  );
}

type Props = {
  simulation: Simulation;
  save: SaveToBank;
};

/** Three prose fields stacked, with the result below them. */
export function TheoryLayout({ simulation, save }: Props) {
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const testRef = useRef<HTMLTextAreaElement>(null);

  /**
   * ⌘/Ctrl + ↑↓ walks the three fields in order. Field navigation only —
   * useViewShortcuts registers submit and Escape on the document, and handling
   * them here as well would fire them twice.
   *
   * Only swallows the key when it has somewhere to go, so at either end of the
   * list, or from a textarea outside it, the shortcut is left to the browser.
   */
  function handleFieldNavKeyDown(e: React.KeyboardEvent) {
    if (!e.metaKey && !e.ctrlKey) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    const order = [questionRef, answerRef, testRef];
    const current = order.findIndex((ref) => ref.current === document.activeElement);
    if (current === -1) return;

    const next = current + (e.key === "ArrowDown" ? 1 : -1);
    if (next < 0 || next >= order.length) return;

    e.preventDefault();
    order[next].current?.focus();
  }

  return (
    <div className="simulation-body" onKeyDown={handleFieldNavKeyDown}>
      <div className="simulation-section-header">
        <h2 className="simulation-section-title">Question Setup</h2>
        <TypeSwitcher value={simulation.bankType} onChange={simulation.setBankType} />
      </div>

      <div className="simulation-cards-row">
        <FieldCard
          label="Question"
          placeholder="What do you want to test?"
          value={simulation.question}
          onChange={simulation.setQuestion}
          textareaRef={questionRef}
          autoFocus
        />
        <FieldCard
          label="Expected Answer"
          sublabel="Key points that should be covered"
          placeholder="List the key concepts the answer should cover..."
          value={simulation.expectedAnswer}
          onChange={simulation.setExpectedAnswer}
          textareaRef={answerRef}
        />
      </div>

      <div className="simulation-test-section">
        <FieldCard
          label="Your Test Answer"
          sublabel="This is what will be graded"
          placeholder="Type your test answer here to see how it grades..."
          value={simulation.testAnswer}
          onChange={simulation.setTestAnswer}
          className="simulation-card--test"
          textareaRef={testRef}
        />
      </div>

      <ResultCard simulation={simulation} save={save} />
    </div>
  );
}
