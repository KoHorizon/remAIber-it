import type { ReactNode } from "react";

export function renderInlineCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function renderFormattedText(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="formatted-list">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineCode(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.substring(2));
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <span key={`line-${index}`}>
          {renderInlineCode(trimmed)}
          {index < lines.length - 1 && <br />}
        </span>
      );
    }
  });

  flushList();
  return elements;
}
