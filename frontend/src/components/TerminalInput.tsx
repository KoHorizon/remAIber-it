import { useRef, useEffect } from "react";
import "./TerminalInput.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
};

export function TerminalInput({
  value,
  onChange,
  placeholder,
  height = "150px",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="terminal-input" style={{ minHeight: height }}>
      <div className="terminal-input-header">
        <span className="terminal-dot red"></span>
        <span className="terminal-dot yellow"></span>
        <span className="terminal-dot green"></span>
        <span className="terminal-title">Terminal</span>
      </div>
      <div className="terminal-input-body">
        <span className="terminal-prompt">$</span>
        <textarea
          ref={textareaRef}
          className="terminal-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Enter command..."}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
