import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { CodeEditor } from "./CodeEditor";
import { IconButton } from "./ui";
import "./QuestionBodyEditor.css";

type TextBlock = { type: "text"; content: string };
type CodeBlock = { type: "code"; language: string; content: string };
type Block = TextBlock | CodeBlock;

const FENCE_RE = /^```(\w*)\s*$/;

// Parses a "```lang\ncode\n```"-fenced string into alternating text/code
// blocks, mirroring the fence convention renderFormattedText already reads.
function parseBlocks(value: string): Block[] {
  const lines = value.split("\n");
  const blocks: Block[] = [];
  let textBuf: string[] = [];
  let i = 0;

  function flushText() {
    blocks.push({ type: "text", content: textBuf.join("\n") });
    textBuf = [];
  }

  while (i < lines.length) {
    const fenceMatch = lines[i].match(FENCE_RE);
    if (fenceMatch) {
      flushText();
      const language = fenceMatch[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "```") {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or end of string if unclosed)
      blocks.push({ type: "code", language, content: codeLines.join("\n") });
    } else {
      textBuf.push(lines[i]);
      i++;
    }
  }
  flushText();

  return blocks.length > 0 ? blocks : [{ type: "text", content: "" }];
}

function serializeBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => (b.type === "text" ? b.content : "```" + b.language + "\n" + b.content + "\n```"))
    .join("\n");
}

export type QuestionBodyEditorHandle = {
  focus: () => void;
  insertBold: () => void;
  insertInlineCode: () => void;
  insertBulletList: () => void;
  insertNumberedList: () => void;
  insertCodeBlock: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
};

export const QuestionBodyEditor = forwardRef<QuestionBodyEditorHandle, Props>(
  function QuestionBodyEditor({ value, onChange, language, placeholder }, ref) {
    const blocks = useMemo(() => parseBlocks(value), [value]);
    const activeIndexRef = useRef<number | null>(null);
    const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

    // Mirrors `blocks` into a ref so the callbacks below can read the latest
    // value without depending on it — `blocks` is recomputed on every
    // keystroke, which would otherwise recreate every callback each render.
    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;

    const updateBlock = useCallback(
      (index: number, content: string) => {
        const next = blocksRef.current.map((b, i) => (i === index ? { ...b, content } : b));
        onChange(serializeBlocks(next));
      },
      [onChange]
    );

    const removeBlock = useCallback(
      (index: number) => {
        const next = blocksRef.current.filter((_, i) => i !== index);
        onChange(serializeBlocks(next.length > 0 ? next : [{ type: "text", content: "" }]));
      },
      [onChange]
    );

    const addCodeBlock = useCallback(() => {
      const next: Block[] = [
        ...blocksRef.current,
        { type: "code", language: language || "", content: "" },
        { type: "text", content: "" },
      ];
      onChange(serializeBlocks(next));
    }, [onChange, language]);

    // Wraps the active text block's current selection with `before`/`after` (e.g. "**"/"**").
    const wrapSelection = useCallback(
      (before: string, after: string = before) => {
        const idx = activeIndexRef.current;
        if (idx === null || blocksRef.current[idx]?.type !== "text") return;
        const el = textareaRefs.current.get(idx);
        if (!el) return;
        const { selectionStart, selectionEnd, value: content } = el;
        const selected = content.slice(selectionStart, selectionEnd);
        const next = content.slice(0, selectionStart) + before + selected + after + content.slice(selectionEnd);
        updateBlock(idx, next);
        requestAnimationFrame(() => {
          el.focus();
          el.selectionStart = selectionStart + before.length;
          el.selectionEnd = selectionStart + before.length + selected.length;
        });
      },
      [updateBlock]
    );

    // Prefixes the line the cursor is on in the active text block (e.g. "- ", "1. ").
    const prefixCurrentLine = useCallback(
      (marker: string) => {
        const idx = activeIndexRef.current;
        if (idx === null || blocksRef.current[idx]?.type !== "text") return;
        const el = textareaRefs.current.get(idx);
        if (!el) return;
        const { selectionStart, value: content } = el;
        const lineStart = content.lastIndexOf("\n", selectionStart - 1) + 1;
        const next = content.slice(0, lineStart) + marker + content.slice(lineStart);
        updateBlock(idx, next);
        const nextPos = selectionStart + marker.length;
        requestAnimationFrame(() => {
          el.focus();
          el.selectionStart = el.selectionEnd = nextPos;
        });
      },
      [updateBlock]
    );

    const focus = useCallback(() => {
      const idx = activeIndexRef.current ?? 0;
      textareaRefs.current.get(idx)?.focus();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focus,
        insertBold: () => wrapSelection("**"),
        insertInlineCode: () => wrapSelection("`"),
        insertBulletList: () => prefixCurrentLine("- "),
        insertNumberedList: () => prefixCurrentLine("1. "),
        insertCodeBlock: addCodeBlock,
      }),
      [focus, wrapSelection, prefixCurrentLine, addCodeBlock]
    );

    return (
      <div className="question-body-editor">
        {blocks.map((block, i) =>
          block.type === "code" ? (
            <CodeBlockField
              // eslint-disable-next-line react/no-array-index-key -- blocks are only ever appended at the end or removed by filtering; each is fully controlled by `content`, so a shifted index just updates props, never stale state
              key={i}
              content={block.content}
              language={block.language || language || "plaintext"}
              onChange={(content) => updateBlock(i, content)}
              onRemove={() => removeBlock(i)}
            />
          ) : (
            <TextBlockField
              // eslint-disable-next-line react/no-array-index-key -- see the code-block case above
              key={i}
              content={block.content}
              placeholder={i === 0 ? placeholder : undefined}
              autoFocus={i === 0}
              onChange={(content) => updateBlock(i, content)}
              onFocus={() => { activeIndexRef.current = i; }}
              registerRef={(el) => {
                if (el) textareaRefs.current.set(i, el);
                else textareaRefs.current.delete(i);
              }}
            />
          )
        )}
      </div>
    );
  }
);

function TextBlockField({
  content,
  placeholder,
  autoFocus,
  onChange,
  onFocus,
  registerRef,
}: {
  content: string;
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (content: string) => void;
  onFocus: () => void;
  registerRef: (el: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        registerRef(el);
      }}
      className="add-question-textarea qbe-text-block"
      placeholder={placeholder}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      autoFocus={autoFocus}
      rows={1}
    />
  );
}

// Toolbar row for a QuestionBodyEditor: bold/inline-code/lists/code-block,
// driving whichever text block currently has focus via the imperative handle.
export function FormattingToolbar({ target }: { target: RefObject<QuestionBodyEditorHandle | null> }) {
  return (
    <div className="qbe-toolbar">
      <IconButton
        icon={<strong>B</strong>}
        label="Bold"
        size="sm"
        onClick={() => target.current?.insertBold()}
      />
      <IconButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        }
        label="Inline code"
        size="sm"
        onClick={() => target.current?.insertInlineCode()}
      />
      <IconButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        }
        label="Bullet list"
        size="sm"
        onClick={() => target.current?.insertBulletList()}
      />
      <IconButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        }
        label="Numbered list"
        size="sm"
        onClick={() => target.current?.insertNumberedList()}
      />
      <IconButton
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16" />
          </svg>
        }
        label="Code block"
        size="sm"
        onClick={() => target.current?.insertCodeBlock()}
      />
    </div>
  );
}

function CodeBlockField({
  content,
  language,
  onChange,
  onRemove,
}: {
  content: string;
  language: string;
  onChange: (content: string) => void;
  onRemove: () => void;
}) {
  const lineCount = Math.max(3, content.split("\n").length);
  const height = `${Math.min(400, lineCount * 20 + 24)}px`;

  return (
    <div className="qbe-code-block">
      <div className="qbe-code-block-header">
        <span className="qbe-code-block-label">Code</span>
        <IconButton
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          }
          label="Remove code block"
          size="sm"
          variant="danger"
          onClick={onRemove}
        />
      </div>
      <CodeEditor value={content} onChange={onChange} language={language} height={height} />
    </div>
  );
}
