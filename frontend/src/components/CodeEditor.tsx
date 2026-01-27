import Editor from "@monaco-editor/react";
import "./CodeEditor.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
  height?: string;
};

// Map our language names to Monaco language IDs
function getMonacoLanguage(language?: string): string {
  const languageMap: Record<string, string> = {
    go: "go",
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    rust: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    csharp: "csharp",
    php: "php",
    ruby: "ruby",
    swift: "swift",
    kotlin: "kotlin",
    sql: "sql",
    html: "html",
    css: "css",
    shell: "shell",
    bash: "shell",
  };
  return languageMap[language || ""] || "plaintext";
}

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  height = "300px",
}: Props) {
  return (
    <div className="code-editor-container">
      <Editor
        height={height}
        language={getMonacoLanguage(language)}
        value={value}
        onChange={(val) => onChange(val || "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          readOnly,
          placeholder,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
