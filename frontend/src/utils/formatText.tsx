import type { ReactNode } from "react";

// Renders inline segments: backtick code and <placeholder> angle-bracket tokens
export function renderInlineCode(text: string): ReactNode {
  // Split on backtick code OR <placeholder> tokens
  const parts = text.split(/(`[^`]+`|<[^>]+>)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("<") && part.endsWith(">")) {
      return (
        <code key={i} className="inline-code inline-code--placeholder">
          {part}
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
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Numbered list item
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
    } else if (trimmed === "") {
      flushList();
      // Add spacing between paragraphs only if there's content before
      if (elements.length > 0) {
        elements.push(<div key={`spacer-${index}`} className="fmt-spacer" />);
      }
    } else {
      flushList();
      elements.push(
        <p key={`line-${index}`} className="fmt-paragraph">
          {renderInlineCode(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <div className="fmt-body">{elements}</div>;
}
