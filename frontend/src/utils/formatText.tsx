import type { ReactNode } from "react";

// Renders inline segments: bold, backtick code and <placeholder> angle-bracket tokens
export function renderInlineCode(text: string): ReactNode {
  // Split on bold **text**, backtick code, or <placeholder> tokens
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|<[^>]+>)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
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
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

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

  const flushCodeBlock = () => {
    elements.push(
      <pre key={`code-${elements.length}`} className="fmt-code-block" data-lang={codeBlockLang || undefined}>
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
    codeBlockLines = [];
    codeBlockLang = "";
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (trimmed === "```") {
        inCodeBlock = false;
        flushList();
        flushCodeBlock();
      } else {
        codeBlockLines.push(line);
      }
      return;
    }

    if (trimmed.startsWith("```")) {
      flushList();
      inCodeBlock = true;
      codeBlockLang = trimmed.slice(3).trim();
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.substring(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
    } else if (trimmed === "") {
      flushList();
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

  // Unclosed code block — flush what we have
  if (inCodeBlock) flushCodeBlock();
  flushList();
  return <div className="fmt-body">{elements}</div>;
}
