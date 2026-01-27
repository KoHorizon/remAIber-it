import "./TerminalDisplay.css";

type Props = {
  value: string;
  expanded?: boolean;
  maxLines?: number;
};

export function TerminalDisplay({
  value,
  expanded = true,
  maxLines = 15,
}: Props) {
  const lines = value.split("\n");
  const shouldCollapse = !expanded && lines.length > maxLines;
  const displayedLines = shouldCollapse ? lines.slice(0, maxLines) : lines;

  return (
    <div className="terminal-display">
      <div className="terminal-header">
        <span className="terminal-dot red"></span>
        <span className="terminal-dot yellow"></span>
        <span className="terminal-dot green"></span>
        <span className="terminal-title">Terminal</span>
      </div>
      <div className="terminal-body">
        {displayedLines.map((line, index) => (
          <div key={index} className="terminal-line">
            <span className="terminal-prompt">$</span>
            <span className="terminal-command">{line}</span>
          </div>
        ))}
        {shouldCollapse && (
          <div className="terminal-line terminal-more">
            <span className="terminal-prompt">...</span>
            <span className="terminal-command muted">
              {lines.length - maxLines} more lines
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
