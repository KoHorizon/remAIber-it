import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import "./TerminalEditor.css";

// Define terminal theme for Monaco
const defineTerminalTheme = () => {
  loader.init().then((monaco) => {
    monaco.editor.defineTheme("terminal-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b6358", fontStyle: "italic" },
        { token: "keyword", foreground: "e07a5f" },
        { token: "string", foreground: "81b29a" },
        { token: "number", foreground: "e9c46a" },
        { token: "type", foreground: "f2cc8f" },
        { token: "function", foreground: "e9c46a" },
        { token: "variable", foreground: "e8e0d4" },
        { token: "operator", foreground: "e07a5f" },
      ],
      colors: {
        "editor.background": "#2d2a24",
        "editor.foreground": "#e8e0d4",
        "editor.lineHighlightBackground": "#2d2a2400",
        "editorLineNumber.foreground": "#2d2a24",
        "editorLineNumber.activeForeground": "#2d2a24",
        "editor.selectionBackground": "#4a443a",
        "editor.inactiveSelectionBackground": "#3d3830",
        "editorCursor.foreground": "#81b29a",
        "editorWhitespace.foreground": "#3d3830",
        "scrollbarSlider.background": "#4a443a80",
        "scrollbarSlider.hoverBackground": "#5a5248a0",
        "scrollbarSlider.activeBackground": "#6a6258c0",
      },
    });
  });
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
};

export function TerminalEditor({
  value,
  onChange,
  placeholder = "Enter command...",
  height = "100%",
  readOnly = false,
}: Props) {
  const themeInitialized = useRef(false);

  useEffect(() => {
    if (!themeInitialized.current) {
      defineTerminalTheme();
      themeInitialized.current = true;
    }
  }, []);

  return (
    <div className="terminal-editor" style={{ height }}>
      <div className="terminal-editor-header">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-title">Terminal</span>
      </div>
      <div className="terminal-editor-body">
        <span className="terminal-prompt">$</span>
        <div className="terminal-editor-monaco">
          <Editor
          height="100%"
          language="shell"
          value={value}
          onChange={(val) => onChange(val || "")}
          theme="terminal-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            readOnly,
            padding: { top: 0, bottom: 0 },
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            scrollbar: {
              vertical: "auto",
              horizontal: "hidden",
              verticalScrollbarSize: 6,
            },
            placeholder,
          }}
        />
        </div>
      </div>
    </div>
  );
}
